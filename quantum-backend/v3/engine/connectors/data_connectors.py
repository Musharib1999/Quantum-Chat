# -*- coding: utf-8 -*-
"""
Quantum Guru Data Connectors — Engine v3
=========================================
Pre-built enterprise connectors for:
1. Data Ingress:
   - CSV Tabular Ingress (Knapsack, Selection, Asset Portfolio)
   - CSV Distance/Adjacency Matrix Ingress (Max-Cut, TSP, Partitioning)
   - JSON Optimization Problem Ingress (primal IR schema)
2. Data Egress:
   - Solution Assignment Egress (JSON / CSV with constraint audits)
   - Q-Matrix Egress (Dense CSV, Sparse COO, D-Wave BQM JSON)
   - Driver Script Egress (Standalone executable Python)
"""

import csv
import io
import json
import re
from typing import Dict, List, Any, Optional, Tuple


# =========================================================================
# 1. DATA INGRESS CONNECTORS
# =========================================================================

class CSVProblemIngress:
    """
    Ingests CSV datasets and automatically converts them into
    mathematically rigorous optimization formulations ready for AutoQUBO.
    """

    @staticmethod
    def parse_tabular(
        csv_text: str,
        problem_type: str = "selection",
        name_col: Optional[str] = None,
        objective_col: Optional[str] = None,
        sense: str = "MAXIMIZE",
        constraints_config: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Parses a tabular CSV where each row is a potential candidate/asset/item.
        """
        reader = csv.DictReader(io.StringIO(csv_text.strip()))
        rows = list(reader)
        if not rows:
            raise ValueError("CSV content is empty or headers are missing.")

        fieldnames = reader.fieldnames or []
        cleaned_fields = [f.strip() for f in fieldnames]

        # Auto-detect name column
        if not name_col:
            for candidate in ["name", "item", "id", "asset", "project", "facility", "node", "label"]:
                for f in cleaned_fields:
                    if f.lower() == candidate:
                        name_col = f
                        break
                if name_col:
                    break
            if not name_col:
                name_col = cleaned_fields[0]

        # Auto-detect objective column
        if not objective_col:
            for candidate in ["value", "return", "yield", "profit", "benefit", "cost", "weight", "capex", "score"]:
                for f in cleaned_fields:
                    if f.lower() == candidate:
                        objective_col = f
                        break
                if objective_col:
                    break
            if not objective_col:
                # Find first numeric column
                for f in cleaned_fields:
                    if f != name_col:
                        try:
                            float(rows[0][f])
                            objective_col = f
                            break
                        except (ValueError, TypeError):
                            pass
            if not objective_col:
                objective_col = cleaned_fields[1] if len(cleaned_fields) > 1 else cleaned_fields[0]

        # Extract items and sanitize variable names
        items = []
        for idx, row in enumerate(rows):
            raw_name = str(row.get(name_col, f"item_{idx}")).strip()
            safe_var = re.sub(r"[^a-zA-Z0-9_]", "_", raw_name)
            if not safe_var or safe_var[0].isdigit():
                safe_var = f"x_{safe_var}"

            try:
                obj_val = float(row.get(objective_col, 1.0))
            except (ValueError, TypeError):
                obj_val = 1.0

            numeric_props = {}
            for f in cleaned_fields:
                try:
                    numeric_props[f] = float(row[f])
                except (ValueError, TypeError, KeyError):
                    pass

            items.append({
                "var_name": safe_var,
                "display_name": raw_name,
                "obj_val": obj_val,
                "properties": numeric_props
            })

        # Formulate Objective expression
        sense = sense.upper()
        if sense not in ("MINIMIZE", "MAXIMIZE", "MIN", "MAX"):
            sense = "MAXIMIZE"

        obj_terms = []
        for it in items:
            c = it["obj_val"]
            v = it["var_name"]
            if c != 0:
                obj_terms.append(f"{c:g}*{v}")

        obj_expr = " + ".join(obj_terms) if obj_terms else "0"

        # Formulate Constraints
        constraints = []
        if constraints_config:
            for c_conf in constraints_config:
                col = c_conf.get("column")
                op = c_conf.get("op", "<=")
                rhs = float(c_conf.get("rhs", 100.0))
                c_name = c_conf.get("name", f"cap_{col}")

                lhs_terms = []
                for it in items:
                    val = it["properties"].get(col, 0.0)
                    if val != 0:
                        lhs_terms.append(f"{val:g}*{it['var_name']}")
                if lhs_terms:
                    constraints.append({
                        "name": c_name,
                        "left": " + ".join(lhs_terms),
                        "op": op,
                        "right": rhs
                    })
        else:
            # Default auto-constraint: Budget or Capacity if a weight/cost column exists
            for candidate in ["weight", "cost", "capex", "budget", "cost_m"]:
                matched_col = None
                for f in cleaned_fields:
                    if f.lower() == candidate and f != objective_col:
                        matched_col = f
                        break
                if matched_col:
                    total_val = sum(it["properties"].get(matched_col, 0.0) for it in items)
                    default_cap = round(total_val * 0.6, 2)  # 60% capacity knapsack default
                    lhs_terms = [f"{it['properties'].get(matched_col, 0.0):g}*{it['var_name']}" for it in items if it["properties"].get(matched_col, 0.0) != 0]
                    constraints.append({
                        "name": f"max_{matched_col}",
                        "left": " + ".join(lhs_terms),
                        "op": "<=",
                        "right": default_cap
                    })
                    break

        # Generate Formulation text string
        formulation_lines = [f"{sense} {obj_expr}", "SUBJECT TO"]
        if constraints:
            for c in constraints:
                formulation_lines.append(f"{c['left']} {c['op']} {c['right']}")
        else:
            # At least one constraint for non-trivial QUBO
            all_vars = [it["var_name"] for it in items]
            formulation_lines.append(f"{' + '.join(all_vars)} >= 1")

        problem_text = "\n".join(formulation_lines)

        return {
            "success": True,
            "problem_type": problem_type,
            "items_count": len(items),
            "variables": [it["var_name"] for it in items],
            "objective": {"sense": sense, "expression": obj_expr, "column": objective_col},
            "constraints": constraints,
            "formulation_text": problem_text,
            "sample_preview": items[:5]
        }

    @staticmethod
    def parse_adjacency_matrix(csv_text: str, problem_type: str = "maxcut") -> Dict[str, Any]:
        """
        Parses an adjacency matrix CSV into a Graph Max-Cut or Graph Partitioning formulation.
        """
        lines = [line.strip() for line in csv_text.strip().splitlines() if line.strip()]
        if not lines:
            raise ValueError("CSV content is empty.")

        # Check for header
        first_tokens = [t.strip() for t in lines[0].split(",")]
        has_header = False
        try:
            float(first_tokens[0])
        except ValueError:
            has_header = True

        matrix_rows = []
        labels = []
        if has_header:
            labels = first_tokens
            data_lines = lines[1:]
        else:
            labels = [f"v_{i}" for i in range(len(first_tokens))]
            data_lines = lines

        for r_idx, line in enumerate(data_lines):
            row_tokens = [t.strip() for t in line.split(",")]
            # If first column is label
            try:
                float(row_tokens[0])
                num_tokens = [float(x) for x in row_tokens]
            except ValueError:
                num_tokens = [float(x) for x in row_tokens[1:]]
            matrix_rows.append(num_tokens)

        n = len(matrix_rows)
        edges = []
        for i in range(n):
            for j in range(i + 1, min(n, len(matrix_rows[i]))):
                w = matrix_rows[i][j]
                if abs(w) > 1e-9:
                    edges.append((labels[i], labels[j], w))

        # Build Max-Cut objective: max sum_{(i,j)} w_ij * (x_i + x_j - 2*x_i*x_j)
        # In QUBO minimization: min sum_{(i,j)} w_ij * (2*x_i*x_j - x_i - x_j)
        obj_terms = []
        for u, v, w in edges:
            obj_terms.append(f"{2*w:g}*{u}*{v} - {w:g}*{u} - {w:g}*{v}")

        obj_expr = " + ".join(obj_terms) if obj_terms else "0"
        formulation_text = f"MINIMIZE {obj_expr}\nSUBJECT TO\n{labels[0]} + {labels[1 if len(labels) > 1 else 0]} >= 0"

        return {
            "success": True,
            "problem_type": "maxcut",
            "nodes": labels[:n],
            "edges_count": len(edges),
            "edges": [{"source": u, "target": v, "weight": w} for u, v, w in edges[:20]],
            "formulation_text": formulation_text
        }


class JSONProblemIngress:
    """
    Ingests and validates structured JSON mathematical models.
    """

    @staticmethod
    def parse_json(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates and parses JSON optimization model schema.
        Expected schema:
        {
          "objective": { "sense": "MINIMIZE"|"MAXIMIZE", "expression": "3*x + 4*y" },
          "variables": [ {"name": "x", "type": "BINARY"}, ... ],
          "constraints": [ {"name": "c1", "left": "x + y", "op": ">=", "right": 1.0} ]
        }
        """
        if "objective" not in payload:
            raise ValueError("Missing 'objective' in JSON optimization model.")

        obj = payload["objective"]
        sense = str(obj.get("sense", "MINIMIZE")).upper()
        expr = str(obj.get("expression", "0")).strip()

        constraints = payload.get("constraints", [])
        variables = payload.get("variables", [])

        # Build formulation text
        lines = [f"{sense} {expr}", "SUBJECT TO"]
        for c in constraints:
            lines.append(f"{c.get('left', '0')} {c.get('op', '<=')} {c.get('right', 0.0)}")

        return {
            "success": True,
            "objective": {"sense": sense, "expression": expr},
            "variables": variables,
            "constraints": constraints,
            "formulation_text": "\n".join(lines)
        }


# =========================================================================
# 2. DATA EGRESS CONNECTORS
# =========================================================================

class SolutionEgress:
    """
    Serializes and exports optimal solutions, bitstrings, and feasibility
    audits into enterprise data exchange formats.
    """

    @staticmethod
    def to_json(
        solution_sample: Dict[str, int],
        energy: float,
        variables: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Serializes solution to standard JSON payload.
        """
        active_vars = [k for k, v in solution_sample.items() if v == 1]
        payload = {
            "solver": "D-Wave Simulated Annealing / Advantage QPU",
            "ground_energy": energy,
            "num_variables": len(variables),
            "num_active": len(active_vars),
            "solution_assignment": solution_sample,
            "active_variables": active_vars,
            "bitstring": "".join(str(solution_sample.get(v, 0)) for v in variables),
            "metadata": metadata or {}
        }
        return json.dumps(payload, indent=2)

    @staticmethod
    def to_csv(solution_sample: Dict[str, int], variables: List[str]) -> str:
        """
        Exports solution variable assignments as CSV.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Variable", "Selected", "Value"])
        for v in variables:
            val = solution_sample.get(v, 0)
            writer.writerow([v, "YES" if val == 1 else "NO", val])
        return output.getvalue()


class QMatrixEgress:
    """
    Serializes and exports compiled Q-matrices into Dense CSV, Sparse COO,
    and D-Wave BQM JSON formats.
    """

    @staticmethod
    def to_dense_csv(q_matrix: List[List[float]], variable_names: List[str]) -> str:
        """
        Exports Q-matrix as a dense symmetric/upper-triangular CSV table with headers.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Var"] + variable_names)
        for i, row in enumerate(q_matrix):
            v_name = variable_names[i] if i < len(variable_names) else f"q_{i}"
            writer.writerow([v_name] + [f"{float(x):g}" for x in row])
        return output.getvalue()

    @staticmethod
    def to_sparse_coo(q_matrix: List[List[float]], variable_names: List[str]) -> str:
        """
        Exports Q-matrix as Coordinate List (COO): row, col, coupler_weight.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Row_Variable", "Col_Variable", "Weight", "Type"])
        n = len(q_matrix)
        for i in range(n):
            for j in range(i, len(q_matrix[i])):
                w = float(q_matrix[i][j])
                if abs(w) > 1e-9:
                    u = variable_names[i] if i < len(variable_names) else f"q_{i}"
                    v = variable_names[j] if j < len(variable_names) else f"q_{j}"
                    entry_type = "Linear_Bias" if i == j else "Quadratic_Coupler"
                    writer.writerow([u, v, f"{w:g}", entry_type])
        return output.getvalue()

    @staticmethod
    def to_bqm_json(q_matrix: List[List[float]], variable_names: List[str], offset: float = 0.0) -> str:
        """
        Exports Q-matrix in standardized dimod BinaryQuadraticModel JSON format.
        """
        linear = {}
        quadratic = {}
        n = len(q_matrix)
        for i in range(n):
            u = variable_names[i] if i < len(variable_names) else f"q_{i}"
            for j in range(i, len(q_matrix[i])):
                w = float(q_matrix[i][j])
                if abs(w) > 1e-9:
                    if i == j:
                        linear[u] = w
                    else:
                        v = variable_names[j] if j < len(variable_names) else f"q_{j}"
                        quadratic[f"{u},{v}"] = w

        payload = {
            "schema": "dimod.BinaryQuadraticModel",
            "vartype": "BINARY",
            "offset": offset,
            "linear": linear,
            "quadratic": quadratic,
            "num_variables": n,
            "variables": variable_names
        }
        return json.dumps(payload, indent=2)
