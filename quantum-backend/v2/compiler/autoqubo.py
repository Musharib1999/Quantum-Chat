"""
AutoQUBO Compiler Bridge — QuantumGuru Engine V7
================================================
Bridges the engine's OptimizationIR to the Fujitsu Research `autoqubo` library
(https://github.com/FujitsuResearch/autoqubo).

Key responsibilities:
  1. Validate that the IR contains only binary decision variables.
     If non-binary variables are detected, raise AutoQuboError so the
     Supervisor surfaces a user-facing re-routing message (Option B).
  2. Build a Python cost function encoding objective + constraint penalties
     so autoqubo.SamplingCompiler auto-generates the QUBO matrix.
  3. Emit complete, executable Python code using:
       - dimod.BinaryQuadraticModel  (industry-standard BQM format)
       - dwave.samplers.SimulatedAnnealingSampler  (local / no QPU)
       - DWaveSampler / EmbeddingComposite  (QPU, commented-out hook)

Place this file at:  <project>/compiler/autoqubo.py

Usage inside the engine (CodeGenerationAgent / DCC fallback guard):
    from ..compiler.autoqubo import AutoQuboCompiler, AutoQuboError
    try:
        code = AutoQuboCompiler.compile(workspace.normalized_model)
    except AutoQuboError as e:
        # e.user_message is safe to surface directly in the UI
        workspace.generated_code = f"# HALTED: {e.user_message}"
"""

from __future__ import annotations

import textwrap
from typing import Any, List


# ---------------------------------------------------------------------------
# Custom exception — carries a user-facing re-routing message
# ---------------------------------------------------------------------------

class AutoQuboError(Exception):
    """
    Raised when AutoQUBO compilation cannot proceed.
    `user_message` is safe to surface directly in the UI.
    """
    def __init__(self, reason: str):
        self.user_message = (
            f"QUBO compilation failed: {reason}\n\n"
            "This problem cannot be auto-compiled to QUBO format. "
            "Please re-route using a different solver:\n"
            "  • CQM  — D-Wave Hybrid (supports integer/continuous variables & hard constraints)\n"
            "  • OR-Tools — Classical CP-SAT / MILP (always available)\n"
            "Select a different solver and resubmit your problem."
        )
        super().__init__(self.user_message)


# ---------------------------------------------------------------------------
# AutoQuboCompiler
# ---------------------------------------------------------------------------

class AutoQuboCompiler:
    """
    Translates an OptimizationIR produced by IRNormalizer into executable
    QUBO Python code via the Fujitsu Research `autoqubo` library.

    The autoqubo library (pip install autoqubo) analyses a Python cost
    function symbolically and extracts the QUBO matrix coefficients
    automatically — no manual penalty design required.
    """

    # Penalty weight applied to every hard constraint violation
    CONSTRAINT_PENALTY: float = 10.0

    @classmethod
    def compile(cls, ir: Any) -> str:
        """
        Main entry point — compile an OptimizationIR to QUBO Python code.

        Parameters
        ----------
        ir : OptimizationIR
            Normalized optimization model from IRNormalizer.normalize().

        Returns
        -------
        str
            Complete, executable Python script (dimod + autoqubo).

        Raises
        ------
        AutoQuboError
            If the IR is None / empty, contains non-binary variables,
            or if script generation fails for any reason.
        """
        # ── Guard 1: IR must exist ───────────────────────────────────────
        if ir is None:
            raise AutoQuboError(
                "No normalized optimization model is available in the workspace."
            )

        # ── Extract variables ────────────────────────────────────────────
        variables: List[str] = cls._extract_variables(ir)
        if not variables:
            raise AutoQuboError(
                "The optimization model contains no decision variables. "
                "QUBO requires at least one binary variable."
            )

        # ── Guard 2: all variables must be binary ────────────────────────
        non_binary = cls._find_non_binary_variables(ir)
        if non_binary:
            raise AutoQuboError(
                f"Non-binary variables detected: {', '.join(non_binary)}. "
                "QUBO requires all decision variables to be binary (0/1). "
                "CQM supports integer and continuous variables and is the "
                "recommended solver for this problem type."
            )

        # ── Build cost function source ───────────────────────────────────
        cost_fn_src = cls._build_cost_function(ir, variables)

        # ── Render and return the full script ────────────────────────────
        try:
            return cls._render_script(ir, variables, cost_fn_src)
        except Exception as e:
            raise AutoQuboError(f"QUBO script generation encountered an error: {e}")

    # ── Private helpers ──────────────────────────────────────────────────

    @classmethod
    def _extract_variables(cls, ir: Any) -> List[str]:
        """Return a flat list of binary variable names from the IR."""
        variables: List[str] = []
        try:
            for v in ir.variables:
                name = getattr(v, "name", None) or str(v)
                dims = getattr(v, "dimensions", None)
                if dims:
                    if len(dims) == 1:
                        for i in range(dims[0]):
                            variables.append(f"{name}_{i}")
                    elif len(dims) == 2:
                        for i in range(dims[0]):
                            for j in range(dims[1]):
                                variables.append(f"{name}_{i}_{j}")
                    else:
                        variables.append(name)
                else:
                    variables.append(name)
        except (AttributeError, TypeError):
            pass
        return variables

    @classmethod
    def _find_non_binary_variables(cls, ir: Any) -> List[str]:
        """Return names of any variables that are NOT binary."""
        non_binary: List[str] = []
        _BINARY_TYPES = {"binary", "bool", "boolean", "spin", "0/1", "bit"}
        try:
            for v in ir.variables:
                vtype = str(
                    getattr(v, "var_type", None)
                    or getattr(v, "type", "binary")
                ).lower().strip()
                if vtype not in _BINARY_TYPES:
                    name = getattr(v, "name", str(v))
                    non_binary.append(f"{name} (type={vtype})")
        except (AttributeError, TypeError):
            pass
        return non_binary

    @classmethod
    def _build_cost_function(cls, ir: Any, variables: List[str]) -> str:
        """
        Build the Python cost function source that autoqubo.SamplingCompiler
        will analyse symbolically to extract the QUBO matrix.

        Encodes:
          - Objective  : linear/quadratic terms with sign flip for maximise
          - Constraints: quadratic penalty terms (penalty * violation^2)
        """
        lines: List[str] = [
            "def cost_function(x):",
            "    # x: dict[variable_name -> int(0|1)]",
            "    # autoqubo analyses this function to build the QUBO matrix.",
            "    total = 0",
        ]

        # Objective
        try:
            obj = ir.objective
            sense = getattr(obj, "sense", "minimize").lower()
            sign = -1 if sense == "maximize" else 1
            for term in getattr(obj, "terms", []):
                coeff = float(getattr(term, "coefficient", 1.0))
                refs = getattr(term, "variable_refs", [])
                if len(refs) == 1:
                    lines.append(f"    total += {sign * coeff} * x['{refs[0]}']")
                elif len(refs) == 2:
                    lines.append(
                        f"    total += {sign * coeff} * x['{refs[0]}'] * x['{refs[1]}']"
                    )
        except (AttributeError, TypeError):
            lines.append(
                "    # NOTE: Objective could not be parsed from IR — manual review required."
            )

        # Constraints as quadratic penalties
        penalty = cls.CONSTRAINT_PENALTY
        try:
            for c in ir.constraints:
                ctype = str(getattr(c, "constraint_type", "eq")).lower()
                lhs_terms = getattr(c, "lhs_terms", [])
                rhs_val = float(getattr(c, "rhs_value", 0))

                lhs_parts: List[str] = []
                for term in lhs_terms:
                    coeff = float(getattr(term, "coefficient", 1.0))
                    refs = getattr(term, "variable_refs", [])
                    if len(refs) == 1:
                        lhs_parts.append(f"{coeff} * x['{refs[0]}']")
                    elif len(refs) == 2:
                        lhs_parts.append(
                            f"{coeff} * x['{refs[0]}'] * x['{refs[1]}']"
                        )

                if not lhs_parts:
                    continue

                lhs_expr = " + ".join(lhs_parts)
                if ctype in ("eq", "==", "="):
                    lines.append(
                        f"    total += {penalty} * ({lhs_expr} - {rhs_val}) ** 2"
                    )
                elif ctype in ("le", "<=", "leq", "upper_bound"):
                    tag = abs(hash(lhs_expr)) % 99999
                    lines.append(
                        f"    _viol_{tag} = max(0, {lhs_expr} - {rhs_val})"
                    )
                    lines.append(
                        f"    total += {penalty} * _viol_{tag} ** 2"
                    )
        except (AttributeError, TypeError):
            lines.append(
                "    # NOTE: Constraints could not be parsed from IR — manual review required."
            )

        lines.append("    return total")
        return "\n".join(lines)

    @classmethod
    def _render_script(
        cls,
        ir: Any,
        variables: List[str],
        cost_fn_src: str,
    ) -> str:
        """Render the complete, executable Python solver script."""
        var_list_repr = repr(variables)
        n_vars = len(variables)

        problem_label = "QUBO Optimization"
        try:
            problem_label = str(ir)[:100].replace("\n", " ")
        except Exception:
            pass

        script = textwrap.dedent(f"""\
            # =================================================================
            # QuantumGuru — QUBO Solver
            # Generator : AutoQuboCompiler (Bit2Qubit Engine V7)
            # Library   : autoqubo by Fujitsu Research
            #             https://github.com/FujitsuResearch/autoqubo
            # Problem   : {problem_label}
            # =================================================================

            # ── Dependencies ──────────────────────────────────────────────────
            # pip install autoqubo dimod dwave-samplers
            import dimod
            from dwave.samplers import SimulatedAnnealingSampler

            try:
                from autoqubo import SamplingCompiler
                _AUTOQUBO_AVAILABLE = True
            except ImportError:
                _AUTOQUBO_AVAILABLE = False
                print("[AutoQUBO] Library not found. Install with: pip install autoqubo")
                print("[AutoQUBO] Falling back to simplified diagonal QUBO.")

            # ── Decision Variables ─────────────────────────────────────────────
            VARIABLES = {var_list_repr}   # {n_vars} binary variables

            # ── Cost Function ─────────────────────────────────────────────────
            # Encodes objective + quadratic constraint penalties.
            # autoqubo.SamplingCompiler analyses this function symbolically
            # to extract the full QUBO coefficient matrix.

            {cost_fn_src}

            # ── QUBO Matrix Generation (via AutoQUBO) ─────────────────────────
            if _AUTOQUBO_AVAILABLE:
                compiler = SamplingCompiler(cost_function, len(VARIABLES))
                qubo_matrix, offset = compiler.get_qubo()

                # Map positional matrix indices → named variable keys
                qubo_dict = {{}}
                for _i, _u in enumerate(VARIABLES):
                    for _j, _v in enumerate(VARIABLES):
                        if _j >= _i:
                            _val = float(qubo_matrix[_i][_j])
                            if abs(_val) > 1e-10:
                                qubo_dict[(_u, _v)] = _val
            else:
                # Simplified diagonal QUBO (no autoqubo) — linear terms only
                qubo_dict = {{(v, v): 1.0 for v in VARIABLES}}
                offset = 0.0

            print(f"[QUBO] Variables    : {{len(VARIABLES)}}")
            print(f"[QUBO] Interactions : {{len(qubo_dict)}}")
            print(f"[QUBO] Offset       : {{offset:.6f}}")

            # ── Build BinaryQuadraticModel ─────────────────────────────────────
            bqm = dimod.BinaryQuadraticModel.from_qubo(qubo_dict, offset=offset)

            # ── Solve: Simulated Annealing (local — no QPU credentials needed) ─
            sampler = SimulatedAnnealingSampler()
            sample_set = sampler.sample(bqm, num_reads=1000, num_sweeps=1000)

            best = sample_set.first
            print(f"\\n[QUBO] Best energy  : {{best.energy:.4f}}")
            print(f"[QUBO] Best sample  : {{dict(best.sample)}}")

            # ── QPU Path (D-Wave hardware) — uncomment when credentials ready ──
            # from dwave.system import DWaveSampler, EmbeddingComposite
            # qpu_sampler = EmbeddingComposite(DWaveSampler())
            # sample_set_qpu = qpu_sampler.sample(bqm, num_reads=100)
            # best_qpu = sample_set_qpu.first
            # print(f"[QPU] Best energy : {{best_qpu.energy:.4f}}")
            # print(f"[QPU] Best sample : {{dict(best_qpu.sample)}}")

            # ── Results ───────────────────────────────────────────────────────
            selected = [k for k, v in best.sample.items() if v == 1]
            print(f"\\n[QUBO] Selected variables: {{selected}}")
        """)

        return script
