import json
import re
from typing import Dict, Any, List, Optional

class GateCompiler:
    SUPPORTED_GATES = {
        "H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ",
        "CX", "CZ", "CY", "CH", "SWAP", "CCX", "CSWAP",
        "MEASURE", "MEASURE_ALL", "BARRIER", "RESET"
    }

    @staticmethod
    def parse_to_ir(spec: Dict[str, Any]) -> Dict[str, Any]:
        """
        Builds a Canonical Circuit IR from the input spec.
        Canonical schema:
        - num_qubits: int
        - num_cbits: int
        - operations: list of objects:
            - gate: string
            - target: list of integers
            - control: integer or None (for CX, CZ, CY, CH, CSWAP)
            - control1: integer or None (for CCX)
            - control2: integer or None (for CCX)
            - theta: string or None (for RX, RY, RZ)
            - qubit: integer or None (for MEASURE, RESET)
            - cbit: integer or None (for MEASURE)
        """
        num_qubits = int(spec.get("num_qubits", spec.get("qubits", 2)))
        num_cbits = int(spec.get("num_cbits", spec.get("cbits", num_qubits)))
        
        raw_ops = spec.get("operations", spec.get("gates", []))
        canonical_ops = []
        
        for op in raw_ops:
            gate_name = str(op.get("gate", "")).upper().strip()
            if not gate_name:
                continue
                
            target = None
            if "target" in op:
                t_val = op["target"]
                if isinstance(t_val, list):
                    target = [int(x) for x in t_val]
                else:
                    target = [int(t_val)]
            elif "targets" in op:
                target = [int(x) for x in op["targets"]]
                
            canonical_op = {"gate": gate_name}
            
            if gate_name in ("H", "X", "Y", "Z", "S", "T"):
                canonical_op["target"] = target if target else [0]
                
            elif gate_name in ("RX", "RY", "RZ"):
                canonical_op["target"] = target if target else [0]
                theta = op.get("theta") or (op.get("params", ["0.0"])[0] if op.get("params") else "0.0")
                canonical_op["theta"] = str(theta)
                
            elif gate_name in ("CX", "CZ", "CY", "CH"):
                if "control" in op:
                    canonical_op["control"] = int(op["control"])
                    canonical_op["target"] = target[0] if target else (1 if int(op["control"]) == 0 else 0)
                else:
                    # Fallback from targets list [control, target]
                    canonical_op["control"] = target[0] if target and len(target) > 0 else 0
                    canonical_op["target"] = target[1] if target and len(target) > 1 else 1
                    
            elif gate_name == "SWAP":
                canonical_op["target"] = target if target and len(target) >= 2 else [0, 1]
                
            elif gate_name == "CCX":
                if "control1" in op and "control2" in op:
                    canonical_op["control1"] = int(op["control1"])
                    canonical_op["control2"] = int(op["control2"])
                    canonical_op["target"] = target[0] if target else 2
                else:
                    canonical_op["control1"] = target[0] if target and len(target) > 0 else 0
                    canonical_op["control2"] = target[1] if target and len(target) > 1 else 1
                    canonical_op["target"] = target[2] if target and len(target) > 2 else 2
                    
            elif gate_name == "CSWAP":
                if "control" in op:
                    canonical_op["control"] = int(op["control"])
                    canonical_op["target"] = target if target else [1, 2]
                else:
                    canonical_op["control"] = target[0] if target and len(target) > 0 else 0
                    canonical_op["target"] = target[1:] if target and len(target) > 1 else [1, 2]
                    
            elif gate_name == "MEASURE":
                q = op.get("qubit")
                if q is None:
                    q = target[0] if target and len(target) > 0 else 0
                c = op.get("cbit")
                if c is None:
                    c = op.get("clbit") or (target[1] if target and len(target) > 1 else q)
                canonical_op["qubit"] = int(q)
                canonical_op["cbit"] = int(c)
                
            elif gate_name == "MEASURE_ALL":
                pass
                
            elif gate_name == "BARRIER":
                canonical_op["target"] = target if target else []
                
            elif gate_name == "RESET":
                q = op.get("qubit")
                if q is None:
                    q = target[0] if target and len(target) > 0 else 0
                canonical_op["qubit"] = int(q)
                
            canonical_ops.append(canonical_op)
            
        raw_meas = spec.get("measurements", [])
        for m in raw_meas:
            q = int(m.get("qubit", 0))
            c = int(m.get("clbit", 0))
            canonical_ops.append({
                "gate": "MEASURE",
                "qubit": q,
                "cbit": c
            })
            
        # Dynamically scale classical register size to accommodate highest referenced bit index
        max_clbit = -1
        for op in canonical_ops:
            if op["gate"] == "MEASURE" and "cbit" in op:
                max_clbit = max(max_clbit, op["cbit"])
        if max_clbit >= 0:
            num_cbits = max(num_cbits, max_clbit + 1)
            
        return {
            "num_qubits": num_qubits,
            "num_cbits": num_cbits,
            "operations": canonical_ops
        }

    @staticmethod
    def check_intent_coverage(ir: Dict[str, Any], expected_manifest: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates and verifies the Intent Coverage Score.
        If coverage < 1.0 (100%), abort compilation.
        """
        if not expected_manifest:
            return {"coverage_score": 1.0, "status": "PASS", "message": "No expected manifest provided. Bypassing coverage check."}
            
        expected_qubits = int(expected_manifest.get("num_qubits", ir["num_qubits"]))
        expected_gates = set(g.upper() for g in expected_manifest.get("gates", []))
        
        qubit_match = (ir["num_qubits"] == expected_qubits)
        actual_gates = set(op["gate"] for op in ir["operations"])
        missing_gates = expected_gates - actual_gates
        
        total_expected = len(expected_gates) + 1
        matches = len(expected_gates - missing_gates) + (1 if qubit_match else 0)
        coverage = matches / total_expected
        
        if coverage < 1.0:
            msg = f"Intent Coverage failure ({coverage*100:.1f}%): expected qubits {expected_qubits} (got {ir['num_qubits']}), missing gates: {list(missing_gates)}"
            return {"coverage_score": coverage, "status": "FAIL", "message": msg}
            
        return {"coverage_score": coverage, "status": "PASS", "message": "Intent coverage check passed (100%)."}

    @staticmethod
    def audit_circuit(ir: Dict[str, Any]) -> Dict[str, Any]:
        """
        Structural Validation and Per-Qubit State Machine Tracking.
        States: ALLOCATED -> SUPERPOSITION -> MEASURED -> DEAD
        """
        num_qubits = ir["num_qubits"]
        num_cbits = ir["num_cbits"]
        operations = ir["operations"]
        
        errors = []
        warnings = []
        suggestions = []
        
        # State machine tracking
        qubit_states = {i: "ALLOCATED" for i in range(num_qubits)}
        clbit_writes = {}
        used_qubits = set()
        adjacency = {i: set() for i in range(num_qubits)}
        has_measurement = False
        
        for idx, op in enumerate(operations):
            g_name = op["gate"]
            
            if g_name not in GateCompiler.SUPPORTED_GATES:
                errors.append(f"Step {idx}: Unsupported gate or operation '{g_name}'")
                continue
                
            # Structural check: Controls/targets distinctness and bounds
            if g_name in ("H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ"):
                t = op["target"][0]
                used_qubits.add(t)
                if t < 0 or t >= num_qubits:
                    errors.append(f"Step {idx}: Gate '{g_name}' references out-of-bounds qubit {t}")
                elif qubit_states[t] in ("MEASURED", "DEAD"):
                    errors.append(f"Step {idx}: Gate '{g_name}' applied to measured/dead qubit {t}")
                    suggestions.append(f"Insert RESET before applying gate '{g_name}' to qubit {t} at step {idx}.")
                elif qubit_states[t] == "ALLOCATED" and g_name == "H":
                    qubit_states[t] = "SUPERPOSITION"
                    
            elif g_name in ("CX", "CZ", "CY", "CH"):
                c = op["control"]
                t = op["target"]
                used_qubits.add(c)
                used_qubits.add(t)
                if c < 0 or c >= num_qubits:
                    errors.append(f"Step {idx}: Control qubit {c} of '{g_name}' is out-of-bounds")
                if t < 0 or t >= num_qubits:
                    errors.append(f"Step {idx}: Target qubit {t} of '{g_name}' is out-of-bounds")
                if c == t:
                    errors.append(f"Step {idx}: Gate '{g_name}' has identical control and target qubit: {c}")
                if c < num_qubits and t < num_qubits:
                    if qubit_states[c] in ("MEASURED", "DEAD"):
                        errors.append(f"Step {idx}: Control qubit {c} is in measured/dead state")
                    if qubit_states[t] in ("MEASURED", "DEAD"):
                        errors.append(f"Step {idx}: Target qubit {t} is in measured/dead state")
                    adjacency[c].add(t)
                    adjacency[t].add(c)
                    
            elif g_name == "SWAP":
                targets = op["target"]
                if len(targets) != 2:
                    errors.append(f"Step {idx}: SWAP gate requires exactly 2 target qubits, got {len(targets)}")
                else:
                    u, v = targets[0], targets[1]
                    used_qubits.add(u)
                    used_qubits.add(v)
                    if u < 0 or u >= num_qubits or v < 0 or v >= num_qubits:
                        errors.append(f"Step {idx}: SWAP gate references out-of-bounds qubits {u}, {v}")
                    if u == v:
                        errors.append(f"Step {idx}: SWAP gate has identical qubits: {u}")
                    if u < num_qubits and v < num_qubits:
                        if qubit_states[u] in ("MEASURED", "DEAD") or qubit_states[v] in ("MEASURED", "DEAD"):
                            errors.append(f"Step {idx}: SWAP gate applied to measured/dead qubits")
                        adjacency[u].add(v)
                        adjacency[v].add(u)
                        
            elif g_name == "CCX":
                c1 = op["control1"]
                c2 = op["control2"]
                t = op["target"]
                used_qubits.add(c1)
                used_qubits.add(c2)
                used_qubits.add(t)
                if len({c1, c2, t}) < 3:
                    errors.append(f"Step {idx}: CCX (Toffoli) gate requires 3 distinct qubits, got: controls=[{c1}, {c2}], target={t}")
                if any(x < 0 or x >= num_qubits for x in (c1, c2, t)):
                    errors.append(f"Step {idx}: CCX gate references out-of-bounds qubits")
                else:
                    if any(qubit_states[x] in ("MEASURED", "DEAD") for x in (c1, c2, t)):
                        errors.append(f"Step {idx}: CCX gate applied to measured/dead qubits")
                    adjacency[c1].add(t)
                    adjacency[c2].add(t)
                    
            elif g_name == "CSWAP":
                c = op["control"]
                targets = op["target"]
                used_qubits.add(c)
                if len(targets) != 2:
                    errors.append(f"Step {idx}: CSWAP (Fredkin) gate requires exactly 2 targets, got {len(targets)}")
                else:
                    u, v = targets[0], targets[1]
                    used_qubits.add(u)
                    used_qubits.add(v)
                    if len({c, u, v}) < 3:
                        errors.append(f"Step {idx}: CSWAP gate requires 3 distinct qubits, got: control={c}, targets=[{u}, {v}]")
                    if any(x < 0 or x >= num_qubits for x in (c, u, v)):
                        errors.append(f"Step {idx}: CSWAP gate references out-of-bounds qubits")
                    else:
                        if any(qubit_states[x] in ("MEASURED", "DEAD") for x in (c, u, v)):
                            errors.append(f"Step {idx}: CSWAP gate applied to measured/dead qubits")
                        adjacency[c].add(u)
                        adjacency[c].add(v)
                        
            elif g_name == "MEASURE":
                has_measurement = True
                q = op["qubit"]
                c = op["cbit"]
                used_qubits.add(q)
                if q < 0 or q >= num_qubits:
                    errors.append(f"Step {idx}: Measurement references out-of-bounds qubit {q}")
                else:
                    qubit_states[q] = "MEASURED"
                if c < 0 or c >= num_cbits:
                    errors.append(f"Step {idx}: Measurement references out-of-bounds classical bit {c}")
                else:
                    clbit_writes.setdefault(c, []).append(idx)
                    
            elif g_name == "MEASURE_ALL":
                has_measurement = True
                for i in range(num_qubits):
                    used_qubits.add(i)
                    qubit_states[i] = "MEASURED"
                    clbit_writes.setdefault(i, []).append(idx)
                    
            elif g_name == "RESET":
                q = op["qubit"]
                used_qubits.add(q)
                if q < 0 or q >= num_qubits:
                    errors.append(f"Step {idx}: Reset references out-of-bounds qubit {q}")
                else:
                    qubit_states[q] = "ALLOCATED"
                    
            elif g_name == "BARRIER":
                for t in op.get("target", []):
                    used_qubits.add(t)
                    if t < 0 or t >= num_qubits:
                        errors.append(f"Step {idx}: Barrier references out-of-bounds qubit {t}")
                        
            # Rotation angle validation
            if g_name in ("RX", "RY", "RZ") and "theta" in op:
                theta_str = op["theta"]
                try:
                    clean_theta = theta_str.replace("pi", "3.14159265").replace("π", "3.14159265").replace("*", "*").strip()
                    eval(clean_theta, {"__builtins__": None}, {})
                except Exception:
                    errors.append(f"Step {idx}: Gate '{g_name}' has invalid rotation parameter: '{theta_str}'")

        if not has_measurement:
            warnings.append("No measurements specified. Simulation will yield default probabilities.")
            
        for cbit, indices in clbit_writes.items():
            if len(indices) > 1:
                warnings.append(f"Classical bit {cbit} is overwritten by multiple measurements at indices: {indices}")
                
        unused = [i for i in range(num_qubits) if i not in used_qubits]
        if unused:
            warnings.append(f"Unused qubits detected: {unused}")
            
        # Connectivity graph component check
        active_qubits = [q for q in used_qubits if 0 <= q < num_qubits]
        if len(active_qubits) > 1:
            visited = set()
            components = []
            for q in active_qubits:
                if q not in visited:
                    comp = []
                    queue = [q]
                    visited.add(q)
                    while queue:
                        curr = queue.pop(0)
                        comp.append(curr)
                        for neighbor in adjacency[curr]:
                            if neighbor not in visited and neighbor in used_qubits and 0 <= neighbor < num_qubits:
                                visited.add(neighbor)
                                queue.append(neighbor)
                    components.append(comp)
            if len(components) > 1:
                warnings.append(f"Disconnected qubits: active components have no interactions: {components}")

        audit_report = [
            {"name": "Qubits allocated", "status": "PASS" if num_qubits > 0 else "FAIL"},
            {"name": "Classical bits allocated", "status": "PASS" if num_cbits > 0 else "FAIL"},
            {"name": "Gate sequence valid", "status": "FAIL" if errors else "PASS"},
            {"name": "Qubit bounds verification", "status": "FAIL" if any("out-of-bounds" in e for e in errors) else "PASS"},
            {"name": "State transitions verification", "status": "FAIL" if any("measured/dead" in e for e in errors) else "PASS"}
        ]

        return {
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions,
            "is_valid": len(errors) == 0,
            "audit_report": audit_report
        }

    @staticmethod
    def calculate_metrics(ir: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 5 — Circuit Metrics (Expanded)
        """
        num_qubits = ir["num_qubits"]
        num_cbits = ir["num_cbits"]
        operations = ir["operations"]
        
        gate_count = 0
        single_qubit_count = 0
        two_qubit_count = 0
        multi_qubit_count = 0
        measurement_count = 0
        barrier_count = 0
        entangling_count = 0
        parameterized_count = 0
        
        for op in operations:
            g_name = op["gate"]
            
            if g_name == "MEASURE":
                measurement_count += 1
            elif g_name == "MEASURE_ALL":
                measurement_count += num_qubits
            elif g_name == "BARRIER":
                barrier_count += 1
            elif g_name == "RESET":
                pass
            else:
                gate_count += 1
                if g_name in ("RX", "RY", "RZ"):
                    parameterized_count += 1
                    single_qubit_count += 1
                elif g_name in ("H", "X", "Y", "Z", "S", "T"):
                    single_qubit_count += 1
                elif g_name in ("CX", "CZ", "CY", "CH"):
                    two_qubit_count += 1
                    entangling_count += 1
                elif g_name == "SWAP":
                    two_qubit_count += 1
                elif g_name == "CCX":
                    multi_qubit_count += 1
                    entangling_count += 1
                elif g_name == "CSWAP":
                    multi_qubit_count += 1
                    entangling_count += 1
                    
        depth = GateCompiler._calculate_depth(num_qubits, operations)
        transpiled_depth = depth + (two_qubit_count * 2) + (multi_qubit_count * 10)
        
        # Estimate simulation complexity
        sim_complexity = "Low"
        if num_qubits > 16 or gate_count > 100:
            sim_complexity = "High"
        elif num_qubits > 8 or gate_count > 40:
            sim_complexity = "Medium"
            
        est_runtime_ms = round(0.05 * (depth + gate_count * 0.1), 3)
        
        return {
            "qubits": num_qubits,
            "cbits": num_cbits,
            "gate_count": gate_count,
            "depth": depth,
            "transpiled_depth": transpiled_depth,
            "single_qubit_gates": single_qubit_count,
            "two_qubit_gates": two_qubit_count,
            "multi_qubit_gates": multi_qubit_count,
            "measurement_count": measurement_count,
            "barrier_count": barrier_count,
            "entangling_gates": entangling_count,
            "parameterized_gates": parameterized_count,
            "estimated_runtime_ms": est_runtime_ms,
            "simulation_complexity": sim_complexity
        }

    @staticmethod
    def _calculate_depth(num_qubits: int, operations: List[Dict[str, Any]]) -> int:
        wire_depths = {i: 0 for i in range(num_qubits)}
        for op in operations:
            g_name = op["gate"]
            targets = []
            if "target" in op:
                t = op["target"]
                targets = t if isinstance(t, list) else [t]
            if "control" in op and op["control"] is not None:
                targets.append(op["control"])
            if "control1" in op and op["control1"] is not None:
                targets.append(op["control1"])
            if "control2" in op and op["control2"] is not None:
                targets.append(op["control2"])
            if "qubit" in op and op["qubit"] is not None:
                targets.append(op["qubit"])
                
            if not targets:
                if g_name in ("MEASURE_ALL", "BARRIER"):
                    max_depth = max(wire_depths.values()) if wire_depths else 0
                    for i in range(num_qubits):
                        wire_depths[i] = max_depth + 1
                continue
                
            max_depth = max(wire_depths.get(t, 0) for t in targets if t < num_qubits)
            for t in targets:
                if t < num_qubits:
                    wire_depths[t] = max_depth + 1
                    
        return max(wire_depths.values()) if wire_depths else 0

    @staticmethod
    def recognize_algorithm(ir: Dict[str, Any]) -> Dict[str, Any]:
        """
        Smarter algorithm recognition with partial matching.
        """
        num_qubits = ir["num_qubits"]
        operations = ir["operations"]
        sequence = [op["gate"] for op in operations]
        non_meas_seq = [g for g in sequence if g not in ("MEASURE", "MEASURE_ALL", "BARRIER", "RESET")]
        
        # 1. Bell State Template: 2 qubits, H on 0, CX on 0->1
        if num_qubits == 2:
            template_ops = [
                {"gate": "H", "target": [0]},
                {"gate": "CX", "control": 0, "target": 1}
            ]
            matches = 0
            for t_op in template_ops:
                for op in operations:
                    if op["gate"] == t_op["gate"]:
                        if t_op["gate"] == "H" and op.get("target") == t_op["target"]:
                            matches += 1
                        elif t_op["gate"] == "CX" and op.get("control") == t_op["control"] and op.get("target") == t_op["target"]:
                            matches += 1
            similarity = matches / len(template_ops)
            if similarity == 1.0:
                return {"algorithm": "Bell State", "confidence": 100.0}
            elif similarity >= 0.5:
                return {"algorithm": "Custom Circuit", "similarity_note": f"Custom Circuit ({int(similarity*100)}% similarity to Bell State)", "confidence": similarity*100}

        # 2. GHZ State Template: N qubits, H on 0, CX on i-1->i
        if num_qubits >= 3:
            template_ops = [{"gate": "H", "target": [0]}]
            for i in range(1, num_qubits):
                template_ops.append({"gate": "CX", "control": i-1, "target": i})
            matches = 0
            for t_op in template_ops:
                for op in operations:
                    if op["gate"] == t_op["gate"]:
                        if t_op["gate"] == "H" and op.get("target") == t_op["target"]:
                            matches += 1
                        elif t_op["gate"] == "CX" and op.get("control") == t_op["control"] and op.get("target") == t_op["target"]:
                            matches += 1
            similarity = matches / len(template_ops)
            if similarity == 1.0:
                return {"algorithm": "GHZ State", "confidence": 100.0}
            elif similarity >= 0.5:
                return {"algorithm": "Custom Circuit", "similarity_note": f"Custom Circuit ({int(similarity*100)}% similarity to GHZ State)", "confidence": similarity*100}

        # Teleportation
        if num_qubits == 3:
            has_bell = False
            for i in range(len(operations) - 1):
                if operations[i]["gate"] == "H" and operations[i].get("target") == [1]:
                    if operations[i+1]["gate"] == "CX" and operations[i+1].get("control") == 1 and operations[i+1].get("target") == 2:
                        has_bell = True
            if has_bell and "CX" in non_meas_seq and "H" in non_meas_seq:
                return {"algorithm": "Quantum Teleportation", "confidence": 90.0}
                
        # Grover Search
        if "H" in non_meas_seq and "X" in non_meas_seq and any(x in non_meas_seq for x in ("CX", "CZ", "CCX")):
            if len(non_meas_seq) > 8:
                return {"algorithm": "Grover Search", "confidence": 85.0}

        return {"algorithm": "Custom Circuit", "confidence": 100.0}

    @staticmethod
    def build_manifest(ir: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compiles a manifest of the parsed circuit IR.
        """
        metrics = GateCompiler.calculate_metrics(ir)
        return {
            "num_qubits": ir["num_qubits"],
            "num_cbits": ir["num_cbits"],
            "operations_count": len(ir["operations"]),
            "measurements_count": metrics["measurement_count"],
            "barriers_count": metrics["barrier_count"],
            "parameterized_gates_count": metrics["parameterized_gates"],
            "estimated_depth": metrics["depth"]
        }

    @staticmethod
    def _parse_qiskit(qiskit_code: str) -> List[Dict[str, Any]]:
        recovered_ops = []
        lines = qiskit_code.split("\n")
        for line in lines:
            line = line.strip()
            if not line.startswith("qc."):
                continue
            if ".c_if(" in line:
                line = line.split(".c_if(")[0]
                
            # Single qubit gates
            h_match = re.match(r"qc\.h\((\d+)\)", line)
            if h_match:
                recovered_ops.append({"gate": "H", "target": [int(h_match.group(1))]})
                continue
            x_match = re.match(r"qc\.x\((\d+)\)", line)
            if x_match:
                recovered_ops.append({"gate": "X", "target": [int(x_match.group(1))]})
                continue
            y_match = re.match(r"qc\.y\((\d+)\)", line)
            if y_match:
                recovered_ops.append({"gate": "Y", "target": [int(y_match.group(1))]})
                continue
            z_match = re.match(r"qc\.z\((\d+)\)", line)
            if z_match:
                recovered_ops.append({"gate": "Z", "target": [int(z_match.group(1))]})
                continue
            s_match = re.match(r"qc\.s\((\d+)\)", line)
            if s_match:
                recovered_ops.append({"gate": "S", "target": [int(s_match.group(1))]})
                continue
            t_match = re.match(r"qc\.t\((\d+)\)", line)
            if t_match:
                recovered_ops.append({"gate": "T", "target": [int(t_match.group(1))]})
                continue

            # Parameterized gates
            rx_match = re.match(r"qc\.rx\(([^,]+),\s*(\d+)\)", line)
            if rx_match:
                theta = rx_match.group(1).replace("np.pi", "pi").strip()
                recovered_ops.append({"gate": "RX", "target": [int(rx_match.group(2))], "theta": theta})
                continue
            ry_match = re.match(r"qc\.ry\(([^,]+),\s*(\d+)\)", line)
            if ry_match:
                theta = ry_match.group(1).replace("np.pi", "pi").strip()
                recovered_ops.append({"gate": "RY", "target": [int(ry_match.group(2))], "theta": theta})
                continue
            rz_match = re.match(r"qc\.rz\(([^,]+),\s*(\d+)\)", line)
            if rz_match:
                theta = rz_match.group(1).replace("np.pi", "pi").strip()
                recovered_ops.append({"gate": "RZ", "target": [int(rz_match.group(2))], "theta": theta})
                continue
            # Multi qubit gates
            cx_match = re.match(r"qc\.cx\((\d+),\s*(\d+)\)", line)
            if cx_match:
                recovered_ops.append({"gate": "CX", "control": int(cx_match.group(1)), "target": int(cx_match.group(2))})
                continue
            cy_match = re.match(r"qc\.cy\((\d+),\s*(\d+)\)", line)
            if cy_match:
                recovered_ops.append({"gate": "CY", "control": int(cy_match.group(1)), "target": int(cy_match.group(2))})
                continue
            cz_match = re.match(r"qc\.cz\((\d+),\s*(\d+)\)", line)
            if cz_match:
                recovered_ops.append({"gate": "CZ", "control": int(cz_match.group(1)), "target": int(cz_match.group(2))})
                continue
            ch_match = re.match(r"qc\.ch\((\d+),\s*(\d+)\)", line)
            if ch_match:
                recovered_ops.append({"gate": "CH", "control": int(ch_match.group(1)), "target": int(ch_match.group(2))})
                continue
            swap_match = re.match(r"qc\.swap\((\d+),\s*(\d+)\)", line)
            if swap_match:
                recovered_ops.append({"gate": "SWAP", "target": [int(swap_match.group(1)), int(swap_match.group(2))]})
                continue
            ccx_match = re.match(r"qc\.ccx\((\d+),\s*(\d+),\s*(\d+)\)", line)
            if ccx_match:
                recovered_ops.append({"gate": "CCX", "control1": int(ccx_match.group(1)), "control2": int(ccx_match.group(2)), "target": int(ccx_match.group(3))})
                continue
            cswap_match = re.match(r"qc\.cswap\((\d+),\s*(\d+),\s*(\d+)\)", line)
            if cswap_match:
                recovered_ops.append({"gate": "CSWAP", "control": int(cswap_match.group(1)), "target": [int(cswap_match.group(2)), int(cswap_match.group(3))]})
                continue

            # Measurement/barriers/reset
            measure_match = re.match(r"qc\.measure\((\d+),\s*(\d+)\)", line)
            if measure_match:
                recovered_ops.append({"gate": "MEASURE", "qubit": int(measure_match.group(1)), "cbit": int(measure_match.group(2))})
                continue
            if "qc.measure_all(" in line:
                recovered_ops.append({"gate": "MEASURE_ALL"})
                continue
            barrier_match = re.match(r"qc\.barrier\((.*)\)", line)
            if barrier_match:
                arg = barrier_match.group(1).strip()
                if arg:
                    try:
                        targets = json.loads(arg)
                        recovered_ops.append({"gate": "BARRIER", "target": targets})
                    except Exception:
                        recovered_ops.append({"gate": "BARRIER", "target": []})
                else:
                    recovered_ops.append({"gate": "BARRIER", "target": []})
                continue
            reset_match = re.match(r"qc\.reset\((\d+)\)", line)
            if reset_match:
                recovered_ops.append({"gate": "RESET", "qubit": int(reset_match.group(1))})
                continue

        return recovered_ops

    @staticmethod
    def verify_round_trip(original_ops: List[Dict[str, Any]], recovered_ops: List[Dict[str, Any]]) -> None:
        """
        Compiler Round-Trip Test.
        Compares original IR operations to recovered IR operations parsed back from Qiskit code.
        """
        if len(original_ops) != len(recovered_ops):
            raise AssertionError(f"Compiler Round-Trip Failed: Original IR contains {len(original_ops)} operations, but Qiskit parser recovered {len(recovered_ops)} operations.")
            
        for idx, (orig, rec) in enumerate(zip(original_ops, recovered_ops)):
            if orig["gate"] != rec["gate"]:
                raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Gate mismatch. Original: {orig['gate']}, Recovered: {rec['gate']}.")
                
            # Check targets/controls
            orig_t = orig.get("target")
            rec_t = rec.get("target")
            if orig_t != rec_t:
                raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Target mismatch. Original: {orig_t}, Recovered: {rec_t}.")
                
            if "control" in orig:
                if orig.get("control") != rec.get("control"):
                    raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Control mismatch. Original: {orig.get('control')}, Recovered: {rec.get('control')}.")
            if "control1" in orig:
                if orig.get("control1") != rec.get("control1") or orig.get("control2") != rec.get("control2"):
                    raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Control arity mismatch.")
            if "qubit" in orig:
                if orig.get("qubit") != rec.get("qubit"):
                    raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Qubit mismatch.")
            if "cbit" in orig:
                if orig.get("cbit") != rec.get("cbit"):
                    raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Classical bit mismatch.")
            if "theta" in orig:
                orig_theta = str(orig.get("theta")).replace("np.pi", "pi").replace(" ", "")
                rec_theta = str(rec.get("theta")).replace("np.pi", "pi").replace(" ", "")
                if orig_theta != rec_theta:
                    # check numerical equivalence
                    try:
                        v1 = eval(orig_theta.replace("pi", "3.14159265"))
                        v2 = eval(rec_theta.replace("pi", "3.14159265"))
                        if abs(v1 - v2) > 1e-5:
                            raise ValueError()
                    except Exception:
                        raise AssertionError(f"Compiler Round-Trip Failed at step {idx}: Parameter mismatch. Original: {orig_theta}, Recovered: {rec_theta}.")

    @staticmethod
    def compile_ir(spec: Dict[str, Any], expected_manifest: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Orchestrates compiling Canonical IR to Qiskit, PennyLane, Cirq, Braket, and OpenQASM 3.
        Runs validation audits, intent coverage checks, compiler round-trip tests, and manifests.
        """
        # Step 1: Parse to Canonical IR
        ir = GateCompiler.parse_to_ir(spec)
        
        # Step 2: Intent Coverage verification
        coverage_res = GateCompiler.check_intent_coverage(ir, expected_manifest)
        if coverage_res["status"] == "FAIL":
            raise ValueError(coverage_res["message"])
            
        # Step 3: Structural audit and per-qubit state tracking
        audit_res = GateCompiler.audit_circuit(ir)
        if not audit_res["is_valid"]:
            diagnostics = "\n".join(audit_res["errors"])
            raise ValueError(f"Circuit Audit structural violations:\n{diagnostics}")
            
        # Step 4: Generate Compiler Manifest
        manifest = GateCompiler.build_manifest(ir)
        
        # Step 5: Recognize Algorithm (smart similarity)
        algo_recognition = GateCompiler.recognize_algorithm(ir)
        
        # Check templates in algorithm library
        algorithm = spec.get("algorithm", "").lower().strip().replace(" ", "_").replace("-", "_")
        from engine.compiler.library import AlgorithmRegistry
        template = AlgorithmRegistry.get_template(algorithm)
        if template is not None:
            template_res = GateCompiler.get_algorithm_template(algorithm, spec)
            # Add other targets code
            canon_ir = GateCompiler.parse_to_ir(template)
            template_res["cirq_code"] = GateCompiler._to_cirq(template_res["num_qubits"], canon_ir["operations"])
            template_res["braket_code"] = GateCompiler._to_braket(template_res["num_qubits"], canon_ir["operations"])
            template_res["openqasm_code"] = GateCompiler._to_openqasm3(template_res["num_qubits"], canon_ir["operations"])
            template_res["metrics"] = GateCompiler.calculate_metrics(ir)
            template_res["audit"] = audit_res
            template_res["manifest"] = manifest
            template_res["algorithm"] = {"algorithm": template["name"], "confidence": 100.0}
            return template_res
            
        # Step 6: Backend compilations
        qiskit_code = GateCompiler._to_qiskit(ir["num_qubits"], ir["operations"])
        pennylane_code = GateCompiler._to_pennylane(ir["num_qubits"], ir["operations"])
        cirq_code = GateCompiler._to_cirq(ir["num_qubits"], ir["operations"])
        braket_code = GateCompiler._to_braket(ir["num_qubits"], ir["operations"])
        openqasm_code = GateCompiler._to_openqasm3(ir["num_qubits"], ir["operations"])
        
        # Step 7: Compiler Round-Trip test
        recovered_ops = GateCompiler._parse_qiskit(qiskit_code)
        GateCompiler.verify_round_trip(ir["operations"], recovered_ops)
        
        # Generate ASCII layout
        ascii_circuit = GateCompiler._generate_ascii(ir["num_qubits"], ir["operations"])
        metrics = GateCompiler.calculate_metrics(ir)
        
        return {
            "qiskit_code": qiskit_code,
            "pennylane_code": pennylane_code,
            "cirq_code": cirq_code,
            "braket_code": braket_code,
            "openqasm_code": openqasm_code,
            "num_qubits": ir["num_qubits"],
            "depth": metrics["depth"],
            "gate_count": metrics["gate_count"],
            "ascii_circuit": ascii_circuit,
            "metrics": metrics,
            "audit": audit_res,
            "manifest": manifest,
            "algorithm": algo_recognition
        }

    @staticmethod
    def _to_qiskit(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        code_lines = [
            "import numpy as np",
            "from qiskit import QuantumCircuit",
            "from qiskit_aer import AerSimulator",
            "",
            "def run_circuit(shots=5000):",
            f"    qc = QuantumCircuit({num_qubits}, {num_qubits})",
            ""
        ]
        
        for op in operations:
            g_name = op["gate"].lower()
            
            if g_name in ("h", "x", "y", "z", "s", "t"):
                code_lines.append(f"    qc.{g_name}({op['target'][0]})")
            elif g_name in ("rx", "ry", "rz"):
                val_str = op["theta"].replace("pi", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi")
                code_lines.append(f"    qc.{g_name}({val_str}, {op['target'][0]})")
            elif g_name in ("cx", "cz", "cy", "ch"):
                code_lines.append(f"    qc.{g_name}({op['control']}, {op['target']})")
            elif g_name == "swap":
                code_lines.append(f"    qc.swap({op['target'][0]}, {op['target'][1]})")
            elif g_name == "ccx":
                code_lines.append(f"    qc.ccx({op['control1']}, {op['control2']}, {op['target']})")
            elif g_name == "cswap":
                code_lines.append(f"    qc.cswap({op['control']}, {op['target'][0]}, {op['target'][1]})")
            elif g_name == "measure":
                code_lines.append(f"    qc.measure({op['qubit']}, {op['cbit']})")
            elif g_name == "measure_all":
                code_lines.append("    qc.measure_all(add_bits=False)")
            elif g_name == "barrier":
                if op.get("target"):
                    code_lines.append(f"    qc.barrier({op['target']})")
                else:
                    code_lines.append("    qc.barrier()")
            elif g_name == "reset":
                code_lines.append(f"    qc.reset({op['qubit']})")
                
        code_lines.extend([
            "",
            "    from qiskit import transpile",
            "    simulator = AerSimulator()",
            "    compiled_circuit = transpile(qc, simulator)",
            "    result = simulator.run(compiled_circuit, shots=shots).result()",
            "    return result.get_counts(compiled_circuit)",
            "",
            "if __name__ == '__main__':",
            "    counts = run_circuit()",
            "    print('Simulation Completed Successfully!')",
            "    print('-' * 55)",
            "    print(f'|  State  |  Counts  |  Probability  |  Histogram')",
            "    print('-' * 55)",
            "    total = sum(counts.values()) or 1",
            "    for k, v in sorted(counts.items()):",
            "        pct = (v / total) * 100",
            "        bar = '█' * int(pct / 4)",
            "        print(f'|  |{k}⟩  |  {v:6d}  |     {pct:5.1f}%     | {bar}')",
            "    print('-' * 55)",
        ])
        return "\n".join(code_lines)

    @staticmethod
    def _to_pennylane(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        code_lines = [
            "import pennylane as qml",
            "import numpy as np",
            "",
            f"dev = qml.device('default.qubit', wires={num_qubits})",
            "@qml.qnode(dev)",
            "def quantum_circuit():"
        ]
        
        for op in operations:
            g_name = op["gate"].lower()
            
            if g_name == "h":
                code_lines.append(f"    qml.Hadamard(wires={op['target'][0]})")
            elif g_name == "x":
                code_lines.append(f"    qml.PauliX(wires={op['target'][0]})")
            elif g_name == "y":
                code_lines.append(f"    qml.PauliY(wires={op['target'][0]})")
            elif g_name == "z":
                code_lines.append(f"    qml.PauliZ(wires={op['target'][0]})")
            elif g_name == "s":
                code_lines.append(f"    qml.S(wires={op['target'][0]})")
            elif g_name == "t":
                code_lines.append(f"    qml.T(wires={op['target'][0]})")
            elif g_name in ("rx", "ry", "rz"):
                val_str = op["theta"].replace("pi", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi")
                code_lines.append(f"    qml.{g_name.upper()}({val_str}, wires={op['target'][0]})")
            elif g_name == "cx":
                code_lines.append(f"    qml.CNOT(wires=[{op['control']}, {op['target']}])")
            elif g_name == "cz":
                code_lines.append(f"    qml.CZ(wires=[{op['control']}, {op['target']}])")
            elif g_name == "swap":
                code_lines.append(f"    qml.SWAP(wires=[{op['target'][0]}, {op['target'][1]}])")
            elif g_name == "ccx":
                code_lines.append(f"    qml.Toffoli(wires=[{op['control1']}, {op['control2']}, {op['target']}])")
            elif g_name == "cswap":
                code_lines.append(f"    qml.CSWAP(wires=[{op['control']}, {op['target'][0]}, {op['target'][1]}])")
                
        code_lines.append("")
        code_lines.append("    return [qml.expval(qml.PauliZ(i)) for i in range(dev.num_wires)]")
        code_lines.extend([
            "",
            "if __name__ == '__main__':",
            "    res = quantum_circuit()",
            "    print('Expectation values:', res)"
        ])
        return "\n".join(code_lines)

    @staticmethod
    def _to_cirq(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        code_lines = [
            "import cirq",
            "import numpy as np",
            "",
            "def run_circuit():",
            f"    qubits = cirq.LineQubit.range({num_qubits})",
            "    circuit = cirq.Circuit()",
            ""
        ]
        
        for op in operations:
            g_name = op["gate"].lower()
            
            if g_name == "h":
                code_lines.append(f"    circuit.append(cirq.H(qubits[{op['target'][0]}]))")
            elif g_name == "x":
                code_lines.append(f"    circuit.append(cirq.X(qubits[{op['target'][0]}]))")
            elif g_name == "y":
                code_lines.append(f"    circuit.append(cirq.Y(qubits[{op['target'][0]}]))")
            elif g_name == "z":
                code_lines.append(f"    circuit.append(cirq.Z(qubits[{op['target'][0]}]))")
            elif g_name == "s":
                code_lines.append(f"    circuit.append(cirq.S(qubits[{op['target'][0]}]))")
            elif g_name == "t":
                code_lines.append(f"    circuit.append(cirq.T(qubits[{op['target'][0]}]))")
            elif g_name in ("rx", "ry", "rz"):
                val_str = op["theta"].replace("pi", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi")
                code_lines.append(f"    circuit.append(cirq.{g_name.upper()}(rads={val_str})(qubits[{op['target'][0]}]))")
            elif g_name == "cx":
                code_lines.append(f"    circuit.append(cirq.CNOT(qubits[{op['control']}], qubits[{op['target']}]))")
            elif g_name == "cz":
                code_lines.append(f"    circuit.append(cirq.CZ(qubits[{op['control']}], qubits[{op['target']}]))")
            elif g_name == "swap":
                code_lines.append(f"    circuit.append(cirq.SWAP(qubits[{op['target'][0]}], qubits[{op['target'][1]}]))")
            elif g_name == "ccx":
                code_lines.append(f"    circuit.append(cirq.TOFFOLI(qubits[{op['control1']}], qubits[{op['control2']}], qubits[{op['target']}]))")
            elif g_name == "cswap":
                code_lines.append(f"    circuit.append(cirq.CSWAP(qubits[{op['control']}], qubits[{op['target'][0]}], qubits[{op['target'][1]}]))")
            elif g_name == "measure":
                code_lines.append(f"    circuit.append(cirq.measure(qubits[{op['qubit']}], key='m_{op['qubit']}'))")
                
        code_lines.extend([
            "",
            "    simulator = cirq.Simulator()",
            "    result = simulator.run(circuit, repetitions=5000)",
            "    return result",
            "",
            "if __name__ == '__main__':",
            "    res = run_circuit()",
            "    print(res)"
        ])
        return "\n".join(code_lines)

    @staticmethod
    def _to_braket(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        code_lines = [
            "from braket.circuits import Circuit",
            "import numpy as np",
            "",
            "def run_circuit():",
            "    circuit = Circuit()",
            ""
        ]
        
        for op in operations:
            g_name = op["gate"].lower()
            
            if g_name == "h":
                code_lines.append(f"    circuit.h({op['target'][0]})")
            elif g_name == "x":
                code_lines.append(f"    circuit.x({op['target'][0]})")
            elif g_name == "y":
                code_lines.append(f"    circuit.y({op['target'][0]})")
            elif g_name == "z":
                code_lines.append(f"    circuit.z({op['target'][0]})")
            elif g_name == "s":
                code_lines.append(f"    circuit.s({op['target'][0]})")
            elif g_name == "t":
                code_lines.append(f"    circuit.t({op['target'][0]})")
            elif g_name in ("rx", "ry", "rz"):
                val_str = op["theta"].replace("pi", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi").replace("π", "np.pi")
                code_lines.append(f"    circuit.{g_name}({op['target'][0]}, {val_str})")
            elif g_name == "cx":
                code_lines.append(f"    circuit.cnot({op['control']}, {op['target']})")
            elif g_name == "cz":
                code_lines.append(f"    circuit.cz({op['control']}, {op['target']})")
            elif g_name == "swap":
                code_lines.append(f"    circuit.swap({op['target'][0]}, {op['target'][1]})")
                
        code_lines.extend([
            "    return circuit",
            "",
            "if __name__ == '__main__':",
            "    circ = run_circuit()",
            "    print(circ)"
        ])
        return "\n".join(code_lines)

    @staticmethod
    def _to_openqasm3(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        code_lines = [
            'OPENQASM 3.0;',
            'include "stdgates.inc";',
            f'qubit[{num_qubits}] q;',
            f'bit[{num_qubits}] c;',
            ''
        ]
        
        for op in operations:
            g_name = op["gate"].lower()
            
            if g_name == "h":
                code_lines.append(f"h q[{op['target'][0]}];")
            elif g_name == "x":
                code_lines.append(f"x q[{op['target'][0]}];")
            elif g_name == "y":
                code_lines.append(f"y q[{op['target'][0]}];")
            elif g_name == "z":
                code_lines.append(f"z q[{op['target'][0]}];")
            elif g_name == "s":
                code_lines.append(f"s q[{op['target'][0]}];")
            elif g_name == "t":
                code_lines.append(f"t q[{op['target'][0]}];")
            elif g_name in ("rx", "ry", "rz"):
                val_str = op["theta"].replace("pi", "3.14159265").replace("π", "3.14159265")
                code_lines.append(f"{g_name}({val_str}) q[{op['target'][0]}];")
            elif g_name == "cx":
                code_lines.append(f"cx q[{op['control']}], q[{op['target']}];")
            elif g_name == "cz":
                code_lines.append(f"cz q[{op['control']}], q[{op['target']}];")
            elif g_name == "swap":
                code_lines.append(f"swap q[{op['target'][0]}], q[{op['target'][1]}];")
            elif g_name == "ccx":
                code_lines.append(f"ccx q[{op['control1']}], q[{op['control2']}], q[{op['target']}];")
            elif g_name == "measure":
                code_lines.append(f"c[{op['cbit']}] = measure q[{op['qubit']}];")
            elif g_name == "barrier":
                if op.get("target"):
                    qubits_str = ", ".join(f"q[{x}]" for x in op["target"])
                    code_lines.append(f"barrier {qubits_str};")
                else:
                    code_lines.append("barrier;")
            elif g_name == "reset":
                code_lines.append(f"reset q[{op['qubit']}];")
                
        return "\n".join(code_lines)

    @staticmethod
    def _generate_ascii(num_qubits: int, operations: List[Dict[str, Any]]) -> str:
        wire_lines = {i: f"Q[{i}]  ──" for i in range(num_qubits)}
        
        for op in operations:
            g_name = op["gate"].upper()
            
            if g_name == "MEASURE_ALL":
                for i in range(num_qubits):
                    wire_lines[i] += "─[M]──"
                continue
            elif g_name == "BARRIER":
                targs = op.get("target", [])
                if not targs:
                    targs = list(range(num_qubits))
                for i in range(num_qubits):
                    if i in targs:
                        wire_lines[i] += "──░───"
                    else:
                        wire_lines[i] += "──────"
                continue
                
            if g_name == "MEASURE":
                q = op["qubit"]
                if q < num_qubits:
                    wire_lines[q] += "─[M]──"
                for i in range(num_qubits):
                    if i != q:
                        wire_lines[i] += "──────"
            elif g_name == "RESET":
                q = op["qubit"]
                if q < num_qubits:
                    wire_lines[q] += "─|0>──"
                for i in range(num_qubits):
                    if i != q:
                        wire_lines[i] += "──────"
            else:
                targets = op.get("target", [])
                if g_name in ("CX", "CZ", "CY", "CH"):
                    ctrl = op["control"]
                    targ = op["target"]
                    if ctrl < num_qubits and targ < num_qubits:
                        wire_lines[ctrl] += "──●───"
                        wire_lines[targ] += "──X───"
                    for i in range(num_qubits):
                        if i != ctrl and i != targ:
                            wire_lines[i] += "──────"
                elif g_name == "SWAP":
                    u, v = targets[0], targets[1]
                    if u < num_qubits and v < num_qubits:
                        wire_lines[u] += "──X───"
                        wire_lines[v] += "──X───"
                    for i in range(num_qubits):
                        if i != u and i != v:
                            wire_lines[i] += "──────"
                elif g_name == "CCX":
                    c1, c2, targ = op["control1"], op["control2"], op["target"]
                    if c1 < num_qubits and c2 < num_qubits and targ < num_qubits:
                        wire_lines[c1] += "──●───"
                        wire_lines[c2] += "──●───"
                        wire_lines[targ] += "──X───"
                    for i in range(num_qubits):
                        if i not in (c1, c2, targ):
                            wire_lines[i] += "──────"
                else:
                    t = targets[0] if targets else 0
                    if t < num_qubits:
                        wire_lines[t] += f"[{g_name}]──"
                    for i in range(num_qubits):
                        if i != t:
                            wire_lines[i] += "──────"
                            
        for i in range(num_qubits):
            wire_lines[i] += "─"
            
        return "\n\n".join(wire_lines[i] for i in range(num_qubits))

    @staticmethod
    def get_algorithm_template(algo: str, spec: Dict[str, Any]) -> Dict[str, Any]:
        from engine.compiler.library import AlgorithmRegistry
        template_key = str(algo).lower().strip().replace(" ", "_").replace("-", "_")
        template = AlgorithmRegistry.get_template(template_key)
        if template:
            num_qubits = template["num_qubits"]
            operations = template["operations"]
            # Compile templates to canonical IR first, then code
            canon_ir = GateCompiler.parse_to_ir(template)
            qiskit_code = GateCompiler._to_qiskit(num_qubits, canon_ir["operations"])
            pennylane_code = GateCompiler._to_pennylane(num_qubits, canon_ir["operations"])
            ascii_circuit = GateCompiler._generate_ascii(num_qubits, canon_ir["operations"])
            depth = GateCompiler._calculate_depth(num_qubits, canon_ir["operations"])
            return {
                "qiskit_code": qiskit_code,
                "pennylane_code": pennylane_code,
                "num_qubits": num_qubits,
                "depth": depth,
                "gate_count": len(canon_ir["operations"]),
                "ascii_circuit": ascii_circuit
            }
        # Fallback to hardcoded Bell State
        qiskit_code = (
            "from qiskit import QuantumCircuit\n"
            "from qiskit_aer import AerSimulator\n\n"
            "def run_bell_state():\n"
            "    qc = QuantumCircuit(2, 2)\n"
            "    qc.h(0)\n"
            "    qc.cx(0, 1)\n"
            "    qc.measure(0, 0)\n"
            "    qc.measure(1, 1)\n"
            "    simulator = AerSimulator()\n"
            "    result = simulator.run(qc, shots=5000).result()\n"
            "    return result.get_counts(qc)\n"
        )
        pennylane_code = (
            "import pennylane as qml\n\n"
            "dev = qml.device('default.qubit', wires=2)\n"
            "@qml.qnode(dev)\n"
            "def bell_state():\n"
            "    qml.Hadamard(wires=0)\n"
            "    qml.CNOT(wires=[0, 1])\n"
            "    return qml.probs(wires=[0, 1])\n"
        )
        ascii_circuit = (
            "Q[0]  ──[H]──●────[M]───\n"
            "             │     │\n"
            "Q[1]  ───────X────[M]───"
        )
        return {
            "qiskit_code": qiskit_code,
            "pennylane_code": pennylane_code,
            "num_qubits": 2,
            "depth": 3,
            "gate_count": 2,
            "ascii_circuit": ascii_circuit
        }
