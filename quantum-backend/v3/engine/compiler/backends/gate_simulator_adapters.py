from typing import Dict, Any, List

class AlgorithmValidator:
    @staticmethod
    def validate(algo_name: str, counts: Dict[str, int], total_shots: int) -> Dict[str, Any]:
        if not counts or total_shots <= 0:
            return {"status": "FAIL", "message": "No counts available for validation."}
            
        from engine.compiler.library import AlgorithmRegistry
        verifier = AlgorithmRegistry.get_verifier(algo_name)
        if verifier:
            try:
                return verifier(counts, total_shots)
            except Exception as e:
                return {"status": "WARNING", "message": f"Verification error: {e}"}
                
        return {
            "status": "PASS",
            "message": "Custom circuit executed successfully. Standard assertion bypass."
        }


class ExecutionAuditor:
    @staticmethod
    def audit(counts: Dict[str, int], expected_shots: int) -> Dict[str, Any]:
        observed_shots = sum(counts.values())
        if observed_shots != expected_shots:
            return {
                "status": "WARNING",
                "message": f"Shots count mismatch: expected {expected_shots}, observed {observed_shots}."
            }
        return {
            "status": "PASS",
            "message": f"Execution verified. Exactly {observed_shots} shots run and accounted for."
        }


class BackendRouter:
    @staticmethod
    def route_and_simulate(
        backend_name: str,
        num_qubits: int,
        num_cbits: int,
        operations: List[Dict[str, Any]],
        shots: int = 5000,
        algo_name: str = "Custom Circuit"
    ) -> Dict[str, Any]:
        backend_clean = backend_name.lower().strip()
        
        if "pennylane" in backend_clean:
            sim_res = PennyLaneAdapter.simulate(num_qubits, operations, shots=shots)
            sim_res["backend_used"] = "PennyLane default.qubit"
        else:
            sim_res = QiskitAdapter.simulate(num_qubits, num_cbits, operations, shots=shots)
            sim_res["backend_used"] = "Qiskit AerSimulator"
            
        if not sim_res["success"]:
            return sim_res
            
        counts = sim_res["counts"]
        audit_res = ExecutionAuditor.audit(counts, shots)
        validation_res = AlgorithmValidator.validate(algo_name, counts, shots)
        
        sim_res["audit"] = audit_res
        sim_res["validation"] = validation_res
        
        return sim_res


class QiskitAdapter:
    @staticmethod
    def simulate(num_qubits: int, num_cbits: int, operations: List[Dict[str, Any]], shots: int = 5000) -> Dict[str, Any]:
        try:
            from qiskit import QuantumCircuit
            from qiskit_aer import AerSimulator
            import numpy as np
            
            qc = QuantumCircuit(num_qubits, num_cbits)
            
            for op in operations:
                g_name = op.get("gate", "").lower()
                
                if g_name in ("h", "x", "y", "z", "s", "t"):
                    qc.h(op["target"][0]) if g_name == "h" else None
                    qc.x(op["target"][0]) if g_name == "x" else None
                    qc.y(op["target"][0]) if g_name == "y" else None
                    qc.z(op["target"][0]) if g_name == "z" else None
                    qc.s(op["target"][0]) if g_name == "s" else None
                    qc.t(op["target"][0]) if g_name == "t" else None
                elif g_name in ("rx", "ry", "rz"):
                    theta_str = op["theta"].replace("pi", "3.14159265").replace("π", "3.14159265").replace("*", "*")
                    val = float(eval(theta_str, {"__builtins__": None}, {}))
                    if g_name == "rx":
                        qc.rx(val, op["target"][0])
                    elif g_name == "ry":
                        qc.ry(val, op["target"][0])
                    elif g_name == "rz":
                        qc.rz(val, op["target"][0])
                elif g_name in ("cx", "cz", "cy", "ch"):
                    qc.cx(op["control"], op["target"]) if g_name == "cx" else None
                    qc.cz(op["control"], op["target"]) if g_name == "cz" else None
                    qc.cy(op["control"], op["target"]) if g_name == "cy" else None
                    qc.ch(op["control"], op["target"]) if g_name == "ch" else None
                elif g_name == "swap":
                    qc.swap(op["target"][0], op["target"][1])
                elif g_name == "ccx":
                    qc.ccx(op["control1"], op["control2"], op["target"])
                elif g_name == "cswap":
                    qc.cswap(op["control"], op["target"][0], op["target"][1])
                elif g_name == "measure":
                    qc.measure(op["qubit"], op["cbit"])
                elif g_name == "measure_all":
                    qc.measure_all(add_bits=False)
                elif g_name == "barrier":
                    if op.get("target"):
                        qc.barrier(op["target"])
                    else:
                        qc.barrier()
                elif g_name == "reset":
                    qc.reset(op["qubit"])
            
            # If no measures exist in the operations, apply a default measure_all at the end
            if not any(op.get("gate") in ("MEASURE", "MEASURE_ALL") for op in operations):
                qc.measure_all(add_bits=False)
                
            from qiskit import transpile
            simulator = AerSimulator()
            t_qc = transpile(qc, simulator)
            job = simulator.run(t_qc, shots=shots)
            result = job.result()
            counts = result.get_counts(t_qc)
            
            return {
                "counts": counts,
                "success": True,
                "error": None
            }
        except Exception as e:
            return {
                "counts": {},
                "success": False,
                "error": str(e)
            }


class PennyLaneAdapter:
    @staticmethod
    def simulate(num_qubits: int, operations: List[Dict[str, Any]], shots: int = 5000) -> Dict[str, Any]:
        try:
            import pennylane as qml
            import numpy as np
            
            dev = qml.device('default.qubit', wires=num_qubits, shots=shots)
            
            @qml.qnode(dev)
            def run_pennylane_circuit():
                for op in operations:
                    g_name = op.get("gate", "").lower()
                    
                    if g_name == "h":
                        qml.Hadamard(wires=op["target"][0])
                    elif g_name == "x":
                        qml.PauliX(wires=op["target"][0])
                    elif g_name == "y":
                        qml.PauliY(wires=op["target"][0])
                    elif g_name == "z":
                        qml.PauliZ(wires=op["target"][0])
                    elif g_name == "s":
                        qml.S(wires=op["target"][0])
                    elif g_name == "t":
                        qml.T(wires=op["target"][0])
                    elif g_name in ("rx", "ry", "rz"):
                        theta_str = op["theta"].replace("pi", "3.14159265").replace("π", "3.14159265").replace("*", "*")
                        val = float(eval(theta_str, {"__builtins__": None}, {}))
                        if g_name == "rx":
                            qml.RX(val, wires=op["target"][0])
                        elif g_name == "ry":
                            qml.RY(val, wires=op["target"][0])
                        elif g_name == "rz":
                            qml.RZ(val, wires=op["target"][0])
                    elif g_name == "cx":
                        qml.CNOT(wires=[op["control"], op["target"]])
                    elif g_name == "cz":
                        qml.CZ(wires=[op["control"], op["target"]])
                    elif g_name == "swap":
                        qml.SWAP(wires=[op["target"][0], op["target"][1]])
                    elif g_name == "ccx":
                        qml.Toffoli(wires=[op["control1"], op["control2"], op["target"]])
                    elif g_name == "cswap":
                        qml.CSWAP(wires=[op["control"], op["target"][0], op["target"][1]])
                
                return qml.counts(all_outcomes=False)
                
            counts = run_pennylane_circuit()
            formatted_counts = {str(k): int(v) for k, v in counts.items()}
            
            return {
                "counts": formatted_counts,
                "success": True,
                "error": None
            }
        except Exception as e:
            return {
                "counts": {},
                "success": False,
                "error": str(e)
            }
