"""
gate_model_pipeline.py — Streamed Gate-Based Quantum Pipeline (Variant 3)
Coordinates parsing of JSON IR, Qiskit/PennyLane/Cirq/Braket/OpenQASM compilation,
Intent Coverage audits, structural per-qubit state tracking, round-trip correctness,
and dynamic algorithm recognition.
Supports decoupled compile vs simulation execution flow.
"""

import json
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional
from ..compiler.backends.gate_compiler import GateCompiler
from ..compiler.backends.gate_simulator_adapters import BackendRouter

async def run_gate_pipeline_stream(
    model_text: str,
    shots: int = 5000,
    email: Optional[str] = None,
    session_id: Optional[str] = None,
    run_simulator: bool = False,
) -> AsyncGenerator[dict, None]:
    """
    Evolved gate-based compilation pipeline implementing the Canonical IR standard.
    Yields:
      - step="parsing"
      - step="compiling"
      - step="simulating" (if run_simulator=True)
      - step="output"
    """
    # ── Stage 1: Parse Canonical IR & Validate Intent ────────────────────────
    yield {"step": "parsing", "status": "running", "message": "Parsing your gate specification..."}
    await asyncio.sleep(0.1)
    
    spec = {}
    expected_manifest = None
    
    try:
        is_json = model_text.strip().startswith('{')
        if is_json:
            parsed_input = json.loads(model_text)
            if "canonical_ir" in parsed_input:
                spec = parsed_input["canonical_ir"]
                expected_manifest = parsed_input.get("expected_manifest")
            else:
                spec = parsed_input
        else:
            clean_input = model_text.strip().lower().replace(" ", "_").replace("-", "_")
            from ..compiler.library.dynamic_compiler import DynamicAlgorithmCompiler
            matched_algo = None
            for support in DynamicAlgorithmCompiler.SUPPORTED:
                if support in clean_input:
                    matched_algo = support
                    break
                    
            if matched_algo:
                yield {"step": "parsing", "status": "running", "message": f"Routing query to dynamic compiler template for '{matched_algo}'."}
                spec = {
                    "algorithm": matched_algo,
                    "parameters": {}
                }
                expected_manifest = None
            else:
                # Check algorithm registry templates
                from ..compiler.library import AlgorithmRegistry
                template = AlgorithmRegistry.get_template(clean_input)
                
                if template:
                    yield {"step": "parsing", "status": "running", "message": f"Retrieved pre-optimized '{template['name']}' template dynamically from database library."}
                    spec = {
                        "num_qubits": template["num_qubits"],
                        "num_cbits": template["num_qubits"],
                        "operations": template["operations"],
                        "algorithm": clean_input
                    }
                    if clean_input == "half_adder":
                        spec["num_cbits"] = 2
                    elif clean_input in ("deutsch_jozsa", "swap_test"):
                        spec["num_cbits"] = 1
                else:
                    yield {"step": "parsing", "status": "running", "message": "Analyzing natural language query and routing to quantum algorithm..."}
                    from ..llm_client import call_primary
                    system_prompt = (
                    "You are an expert quantum semantic router.\n"
                    "Identify the target quantum algorithm and extract its parameters from the user's description.\n"
                    "Your response MUST match this JSON schema exactly:\n"
                    "{\n"
                    '  "algorithm": "bell" | "rng" | "ghz" | "teleportation" | "deutsch_jozsa" | "bernstein_vazirani" | "grover" | "qft" | "qpe" | "qaoa" | "custom",\n'
                    '  "shots": <int_shots_requested_or_default_4096>,\n'
                    '  "parameters": {\n'
                    '    "num_qubits": <int_or_null>,\n'
                    '    "hidden_string": "<binary_string_or_empty>",\n'
                    '    "target_state": "<binary_string_or_empty>",\n'
                    '    "phase": <float_or_null>,\n'
                    '    "edges": [[<int>, <int>], ...],\n'
                    '    "gamma": <float_or_null>,\n'
                    '    "beta": <float_or_null>,\n'
                    '    "oracle_type": "constant" | "balanced"\n'
                    '  },\n'
                    '  "canonical_ir": {\n'
                    '    "num_qubits": <int>,\n'
                    '    "num_cbits": <int>,\n'
                    '    "operations": [\n'
                    '      {"gate": "H"|"X"|"Y"|"Z"|"S"|"T", "target": [qubit_index]},\n'
                    '      {"gate": "RX"|"RY"|"RZ", "target": [qubit_index], "theta": "<string_angle_or_float>"},\n'
                    '      {"gate": "CX"|"CZ"|"CY"|"CH", "control": control_index, "target": target_index},\n'
                    '      {"gate": "SWAP", "target": [qubit_index_1, qubit_index_2]},\n'
                    '      {"gate": "CCX", "control1": ctrl_1, "control2": ctrl_2, "target": target_index},\n'
                    '      {"gate": "CSWAP", "control": ctrl, "target": [target_index_1, target_index_2]},\n'
                    '      {"gate": "MEASURE", "qubit": qubit_index, "cbit": clbit_index},\n'
                    '      {"gate": "BARRIER", "target": [<optional list of qubits>]},\n'
                    '      {"gate": "RESET", "qubit": qubit_index}\n'
                    '    ]\n'
                    '  }\n'
                    "}\n"
                    "If the query is a custom gate request not matching standard algorithms, return algorithm: 'custom' and output a custom 'canonical_ir' block.\n"
                    "Return ONLY raw JSON. No markdown backticks, no explanations."
                )
                    llm_response = await call_primary(system=system_prompt, user=model_text)
                    cleaned_res = llm_response.strip()
                
                    if cleaned_res.startswith("```json"):
                        cleaned_res = cleaned_res[7:]
                    if cleaned_res.startswith("```"):
                        cleaned_res = cleaned_res[3:]
                    if cleaned_res.endswith("```"):
                        cleaned_res = cleaned_res[:-3]
                    cleaned_res = cleaned_res.strip()
                
                    parsed_output = json.loads(cleaned_res)
                    shots = parsed_output.get("shots") or shots
                    if parsed_output.get("algorithm") == "custom":
                            spec = parsed_output.get("canonical_ir", parsed_output)
                    else:
                        spec = parsed_output
                    expected_manifest = None
            
        # Check dynamic templates for supported algorithms
        algorithm = spec.get("algorithm", "").lower().strip()
        from ..compiler.library.dynamic_compiler import DynamicAlgorithmCompiler
        
        # Determine if the specification already contains an explicit gate sequence.
        # If operations are explicitly specified, we compile that sequence exactly and bypass dynamic template substitution.
        has_explicit_ops = False
        ops_list = spec.get("operations") or spec.get("parameters", {}).get("operations")
        if ops_list and len(ops_list) > 0:
            has_explicit_ops = True
            
        if algorithm in DynamicAlgorithmCompiler.SUPPORTED and not has_explicit_ops:
            params = spec.get("parameters", spec)
            spec = DynamicAlgorithmCompiler.compile(algorithm, params, shots=shots)
            
        # Parse & Validate Intent
        ir = GateCompiler.parse_to_ir(spec)
        
        # Verify coverage (Aborts if mismatch)
        if expected_manifest:
            cov_res = GateCompiler.check_intent_coverage(ir, expected_manifest)
            if cov_res["status"] == "FAIL":
                raise ValueError(cov_res["message"])
                
    except Exception as e:
        yield {"step": "error", "message": f"Failed to parse or validate intent: {e}"}
        return
        
    num_qubits = ir["num_qubits"]
    operations = ir["operations"]
    
    yield {
        "step": "parsing",
        "status": "done",
        "message": f"Circuit parsed — {num_qubits} qubits, {len(operations)} operations",
        "num_qubits": num_qubits,
        "gates": operations
    }
    await asyncio.sleep(0.1)

    # ── Stage 2: Audit & Compile Circuit ──────────────────────────────────────
    yield {"step": "compiling", "status": "running", "message": "Auditing and compiling circuit to target backends..."}
    await asyncio.sleep(0.1)
    
    try:
        compiler_res = GateCompiler.compile_ir(spec, expected_manifest, shots=shots)
    except Exception as e:
        yield {"step": "error", "message": f"Compilation or Audit failed: {e}"}
        return
        
    qiskit_code = compiler_res["qiskit_code"]
    pennylane_code = compiler_res["pennylane_code"]
    cirq_code = compiler_res["cirq_code"]
    braket_code = compiler_res["braket_code"]
    openqasm_code = compiler_res["openqasm_code"]
    ascii_circuit = compiler_res["ascii_circuit"]
    metrics = compiler_res["metrics"]
    audit = compiler_res["audit"]
    detected_algo = compiler_res["algorithm"]
    manifest = compiler_res["manifest"]
    
    yield {
        "step": "compiling",
        "status": "done",
        "message": f"Circuit compiled: depth={metrics['depth']}, gates={metrics['gate_count']}",
        "qiskit_code": qiskit_code,
        "pennylane_code": pennylane_code,
        "cirq_code": cirq_code,
        "braket_code": braket_code,
        "openqasm_code": openqasm_code,
        "ascii_circuit": ascii_circuit,
        "depth": metrics["depth"],
        "gate_count": metrics["gate_count"],
        "num_qubits": num_qubits
    }
    await asyncio.sleep(0.1)

    # ── Stage 3: Simulate (Decoupled execution check) ─────────────────────────
    if run_simulator:
        yield {"step": "simulating", "status": "running", "message": "Running simulation on Qiskit Aer Simulator..."}
        await asyncio.sleep(0.1)
        
        sim_res = BackendRouter.route_and_simulate(
            backend_name="qiskit_aer",
            num_qubits=num_qubits,
            num_cbits=ir["num_cbits"],
            operations=operations,
            shots=shots,
            algo_name=detected_algo["algorithm"]
        )
        
        if not sim_res["success"]:
            yield {"step": "error", "message": f"Simulation failed: {sim_res['error']}"}
            return
            
        counts = sim_res["counts"]
        execution_audit = sim_res["audit"]
        algorithm_validation = sim_res["validation"]
        
        yield {
            "step": "simulating",
            "status": "done",
            "message": f"Simulation completed successfully ({shots} shots)",
            "counts": counts
        }
        await asyncio.sleep(0.1)
        
        total_shots = sum(counts.values()) if counts else 1
        prob_lines = []
        if counts:
            for state, count in sorted(counts.items()):
                prob = (count / total_shots) * 100.0
                prob_lines.append(f"  * `|{state}⟩`: {count} counts ({prob:.2f}%)")
                
        backend_info = sim_res["backend_used"]
        status_text = "✅ SUCCESS"
        meas_data = chr(10).join(prob_lines) if prob_lines else 'No measurement data.'
    else:
        counts = None
        backend_info = "Awaiting execution. Click 'Execute' to run simulation."
        status_text = "⏳ AWAITING SIMULATION EXECUTION"
        meas_data = "  * `Awaiting simulation execution...`"

    # ── Stage 4: Output Compilation Trace ─────────────────────────────────────
    # Format audit checklist
    checklist_lines = []
    for item in audit["audit_report"]:
        icon = "✓" if item["status"] == "PASS" else "✗"
        checklist_lines.append(f"  * {icon} {item['name']}")
        
    audit_warnings = audit["warnings"]
    audit_warnings_str = "\n".join(f"  * ⚠️ {w}" for w in audit_warnings) if audit_warnings else "  * ✅ Audit clean. No warnings."
    
    suggestions_str = "\n".join(f"  * 💡 {s}" for s in audit["suggestions"]) if audit["suggestions"] else ""
    suggestions_section = f"\n### Suggestions\n{suggestions_str}\n" if suggestions_str else ""
    
    algo_name_display = detected_algo["algorithm"]
    if "similarity_note" in detected_algo:
        algo_name_display = detected_algo["similarity_note"]

    output_text = f"""### Compiled Qiskit Code
```python
{qiskit_code}
```

### Circuit Layout Diagram
```text
{ascii_circuit}
```

---

### Circuit Manifest
*   **Qubits:** {manifest['num_qubits']}
*   **Classical Bits:** {manifest['num_cbits']}
*   **Operations Count:** {manifest['operations_count']}
*   **Measurements Count:** {manifest['measurements_count']}
*   **Barriers Count:** {manifest['barriers_count']}
*   **Parameterized Gates:** {manifest['parameterized_gates_count']}
*   **Estimated Circuit Depth:** {manifest['estimated_depth']}

---

### Circuit Complexity Metrics
*   **Gate Count:** {metrics['gate_count']}  
*   **Circuit Depth:** {metrics['depth']}  
*   **Transpiled Circuit Depth:** {metrics['transpiled_depth']}
*   **Single Qubit Gates:** {metrics['single_qubit_gates']}  
*   **Two Qubit Gates:** {metrics['two_qubit_gates']}  
*   **Multi Qubit Gates:** {metrics['multi_qubit_gates']}  
*   **Entangling Gates:** {metrics['entangling_gates']}
*   **Parameterized Gates:** {metrics['parameterized_gates']}
*   **Estimated Simulation Complexity:** {metrics['simulation_complexity']}
*   **Estimated Runtime:** {metrics['estimated_runtime_ms']} ms  
*   **Shots Run:** {shots:,}  

---

### Circuit Audit & Diagnostics
*   **Audit Report:**
{chr(10).join(checklist_lines)}
*   **Audit Warnings:**
{audit_warnings_str}
{suggestions_section}"""

    if run_simulator:
        output_text += f"""
---

## Gate-Based Quantum Simulation Output

**Status:** {status_text}  
**Simulator Backend:** {backend_info}  
**Detected Algorithm:** {algo_name_display} (Confidence: {detected_algo['confidence']:.1f}%)  

---

### Measurement Probabilities
{meas_data}"""

    if session_id:
        try:
            import os
            from pymongo import MongoClient
            from bson.objectid import ObjectId
            
            mongo_uri = os.environ.get("MONGODB_URI")
            if mongo_uri:
                client = MongoClient(mongo_uri, tlsAllowInvalidCertificates=True)
                db = client["test"]
                
                # Check simulator and output statuses
                sim_status = "done" if run_simulator else "pending"
                out_status = "done" if run_simulator else "pending"
                sol_msg = f"Simulation completed successfully ({shots} shots)" if run_simulator else "Awaiting simulator execution..."
                ver_msg = "Pipeline complete" if run_simulator else "Awaiting simulation results..."
                
                update_fields = {
                    "workflowSteps.suggested_solver": "GATE_BASED",
                    "workflowSteps.final_code": qiskit_code,
                    "workflowSteps.pennylane_code": pennylane_code,
                    "workflowSteps.cirq_code": cirq_code,
                    "workflowSteps.braket_code": braket_code,
                    "workflowSteps.openqasm_code": openqasm_code,
                    "workflowSteps.q_matrix_preview": ascii_circuit,
                    
                    "workflowSteps.nlp": f"Circuit parsed — {num_qubits} qubits, {len(operations)} operations",
                    "workflowSteps.reasoner": f"Circuit compiled: depth={metrics['depth']}, gates={metrics['gate_count']}",
                    "workflowSteps.suggestor": f"Circuit compiled: depth={metrics['depth']}, gates={metrics['gate_count']}",
                    "workflowSteps.solver": sol_msg,
                    "workflowSteps.verifier": ver_msg,
                    
                    "workflowSteps.parsingStatus": "done",
                    "workflowSteps.qMatrixStatus": "done",
                    "workflowSteps.quboCodeStatus": "done",
                    "workflowSteps.simulatorStatus": sim_status,
                    "workflowSteps.outputStatus": out_status,
                    
                    "workflowSteps.optimization_stats": {
                        "qubits": num_qubits,
                        "depth": metrics["depth"],
                        "gate_count": metrics["gate_count"],
                        "counts": counts,
                        "pennylane_code": pennylane_code,
                        "cirq_code": cirq_code,
                        "braket_code": braket_code,
                        "openqasm_code": openqasm_code
                    }
                }
                
                db.chatsessions.update_one({"_id": ObjectId(session_id)}, {"$set": update_fields})
                client.close()
                print(f"[MongoDB Decoupled] Synced session {session_id} successfully. RunSimulator={run_simulator}")
        except Exception as db_err:
            print(f"[MongoDB Decoupled Error] Failed to update session: {db_err}")

    yield {
        "step": "output",
        "status": "done",
        "message": "Pipeline complete" if run_simulator else "Compilation complete. Ready for execution.",
        "output_text": output_text,
        "counts": counts,
        "qiskit_code": qiskit_code,
        "pennylane_code": pennylane_code,
        "cirq_code": cirq_code,
        "braket_code": braket_code,
        "openqasm_code": openqasm_code,
        "ascii_circuit": ascii_circuit,
        "depth": metrics["depth"],
        "gate_count": metrics["gate_count"],
        "num_qubits": num_qubits
    }
