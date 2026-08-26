import os
from typing import Dict, Any, List

class DynamicAlgorithmCompiler:
    SUPPORTED = {
        "bell", "rng", "ghz", "teleportation", "deutsch_jozsa",
        "bernstein_vazirani", "grover", "qft", "qpe", "qaoa",
        "superdense_coding", "teleportation_arbitrary", "three_qubit_qec",
        "controlled_qft", "phase_kickback", "grover_multi_target",
        "ripple_carry_adder", "quantum_comparator", "vqe", "quantum_walk"
    }

    @staticmethod
    def compile(algorithm: str, params: Dict[str, Any], shots: int = 4096) -> Dict[str, Any]:
        algo = str(algorithm).lower().strip().replace(" ", "_").replace("-", "_")
        
        # Default fallback values
        num_qubits = int(params.get("num_qubits") or 2)
        num_cbits = int(params.get("num_cbits") or num_qubits)
        operations = []
        name = algo.upper()
        contract = {}

        if algo == "bell":
            name = "Bell State"
            num_qubits = 2
            num_cbits = 2
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1}
            ]
            contract = {
                "expected_states": ["00", "11"],
                "minimum_total_probability": 0.90
            }

        elif algo == "rng":
            name = "Quantum RNG"
            num_qubits = int(params.get("num_qubits") or 1)
            num_cbits = num_qubits
            operations = []
            for i in range(num_qubits):
                operations.append({"gate": "H", "target": [i]})
            for i in range(num_qubits):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "entropy_check": True
            }

        elif algo == "ghz":
            name = "GHZ State"
            num_qubits = int(params.get("num_qubits") or 3)
            num_cbits = num_qubits
            operations = [
                {"gate": "H", "target": [0]}
            ]
            for i in range(num_qubits - 1):
                operations.append({"gate": "CX", "control": i, "target": i+1})
            for i in range(num_qubits):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "expected_states": ["000", "111"],
                "minimum_total_probability": 0.90
            }

        elif algo == "teleportation":
            name = "Quantum Teleportation"
            num_qubits = 3
            num_cbits = 2
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "H", "target": [1]},
                {"gate": "CX", "control": 1, "target": 2},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "H", "target": [0]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 1, "target": 2},
                {"gate": "CZ", "control": 0, "target": 2}
            ]
            contract = {
                "teleportation_check": True
            }

        elif algo == "deutsch_jozsa":
            name = "Deutsch-Jozsa Algorithm"
            num_qubits = int(params.get("num_qubits") or 2)
            num_cbits = num_qubits - 1
            oracle_type = str(params.get("oracle_type", "balanced")).lower()
            
            operations = [
                {"gate": "X", "target": [num_qubits - 1]},
                {"gate": "BARRIER", "target": list(range(num_qubits))}
            ]
            for i in range(num_qubits):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            if oracle_type == "balanced":
                for i in range(num_qubits - 1):
                    operations.append({"gate": "CX", "control": i, "target": num_qubits - 1})
                operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(num_qubits - 1):
                operations.append({"gate": "H", "target": [i]})
            
            for i in range(num_qubits - 1):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "deutsch_jozsa_check": True
            }

        elif algo == "bernstein_vazirani":
            name = "Bernstein-Vazirani Algorithm"
            hidden_string = str(params.get("hidden_string", "101"))
            n = len(hidden_string)
            num_qubits = n + 1
            num_cbits = n
            
            operations = [
                {"gate": "X", "target": [n]},
                {"gate": "BARRIER", "target": list(range(num_qubits))}
            ]
            for i in range(num_qubits):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for idx, bit in enumerate(reversed(hidden_string)):
                if bit == "1":
                    operations.append({"gate": "CX", "control": idx, "target": n})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(n):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(n):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "expected_bitstring": hidden_string,
                "minimum_probability": 0.90
            }

        elif algo == "grover":
            name = "Grover Search"
            target_state = str(params.get("target_state", params.get("hidden_string", "11")))
            n = len(target_state)
            num_qubits = n
            num_cbits = n
            operations = []
            
            for i in range(n):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(n))})
            
            for idx, bit in enumerate(reversed(target_state)):
                if bit == "0":
                    operations.append({"gate": "X", "target": [idx]})
            
            if n == 2:
                operations.append({"gate": "CZ", "control": 0, "target": 1})
            elif n == 3:
                operations.append({"gate": "H", "target": [2]})
                operations.append({"gate": "CCX", "control1": 0, "control2": 1, "target": 2})
                operations.append({"gate": "H", "target": [2]})
            else:
                operations.append({"gate": "CZ", "control": 0, "target": 1})
                
            for idx, bit in enumerate(reversed(target_state)):
                if bit == "0":
                    operations.append({"gate": "X", "target": [idx]})
            operations.append({"gate": "BARRIER", "target": list(range(n))})
            
            for i in range(n):
                operations.append({"gate": "H", "target": [i]})
            for i in range(n):
                operations.append({"gate": "X", "target": [i]})
                
            if n == 2:
                operations.append({"gate": "CZ", "control": 0, "target": 1})
            elif n == 3:
                operations.append({"gate": "H", "target": [2]})
                operations.append({"gate": "CCX", "control1": 0, "control2": 1, "target": 2})
                operations.append({"gate": "H", "target": [2]})
            else:
                operations.append({"gate": "CZ", "control": 0, "target": 1})
                
            for i in range(n):
                operations.append({"gate": "X", "target": [i]})
            for i in range(n):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(n))})
            
            for i in range(n):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "expected_bitstring": target_state,
                "minimum_probability": 0.80
            }

        elif algo == "qft":
            name = "Quantum Fourier Transform"
            num_qubits = int(params.get("num_qubits") or 3)
            num_cbits = num_qubits
            operations = []
            
            for i in range(num_qubits):
                operations.append({"gate": "H", "target": [i]})
                for j in range(i + 1, num_qubits):
                    theta = f"pi/{2**(j-i)}"
                    operations.append({"gate": "CP", "control": i, "target": j, "theta": theta})
                    
            for i in range(num_qubits // 2):
                operations.append({"gate": "SWAP", "target": [i, num_qubits - 1 - i]})
                
            for i in range(num_qubits):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "qft_check": True
            }

        elif algo == "qpe":
            name = "Quantum Phase Estimation"
            phase = float(params.get("phase") or 0.25)
            t = 3
            num_qubits = t + 1
            num_cbits = t
            
            operations = [
                {"gate": "X", "target": [t]},
                {"gate": "BARRIER", "target": list(range(num_qubits))}
            ]
            for i in range(t):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for k in range(t):
                theta = f"{2**(k+1)} * pi * {phase}"
                operations.append({"gate": "CP", "control": k, "target": t, "theta": theta})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(t // 2):
                operations.append({"gate": "SWAP", "target": [i, t - 1 - i]})
            for i in range(t):
                for j in range(i):
                    theta = f"-pi/{2**(i-j)}"
                    operations.append({"gate": "CP", "control": j, "target": i, "theta": theta})
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(t):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "qpe_check": True,
                "expected_phase": phase
            }

        elif algo == "qaoa":
            name = "QAOA Max-Cut Solver"
            edges = params.get("edges") or [[0, 1], [1, 2]]
            gamma = float(params.get("gamma") or 0.73)
            beta = float(params.get("beta") or 0.41)
            
            all_nodes = set()
            for u, v in edges:
                all_nodes.add(u)
                all_nodes.add(v)
            num_qubits = max(all_nodes) + 1 if all_nodes else 3
            num_cbits = num_qubits
            
            operations = []
            for i in range(num_qubits):
                operations.append({"gate": "H", "target": [i]})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for u, v in edges:
                operations.append({"gate": "CX", "control": u, "target": v})
                operations.append({"gate": "RZ", "target": [v], "theta": f"2.0 * {gamma}"})
                operations.append({"gate": "CX", "control": u, "target": v})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(num_qubits):
                operations.append({"gate": "RX", "target": [i], "theta": f"2.0 * {beta}"})
            operations.append({"gate": "BARRIER", "target": list(range(num_qubits))})
            
            for i in range(num_qubits):
                operations.append({"gate": "MEASURE", "qubit": i, "cbit": i})
            contract = {
                "qaoa_check": True
            }

        elif algo == "superdense_coding":
            name = "Quantum Superdense Coding"
            message = str(params.get("message") or "10")
            num_qubits = 2
            num_cbits = 2
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "BARRIER", "target": [0, 1]}
            ]
            if message == "01":
                operations.append({"gate": "X", "target": [0]})
            elif message == "10":
                operations.append({"gate": "Z", "target": [0]})
            elif message == "11":
                operations.append({"gate": "X", "target": [0]})
                operations.append({"gate": "Z", "target": [0]})
            operations.append({"gate": "BARRIER", "target": [0, 1]})
            
            operations.extend([
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "H", "target": [0]},
                {"gate": "BARRIER", "target": [0, 1]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1}
            ])
            contract = {
                "expected_bitstring": message,
                "minimum_probability": 0.95
            }

        elif algo == "teleportation_arbitrary":
            name = "Teleportation (RY State)"
            theta = str(params.get("theta") or "pi/3")
            num_qubits = 3
            num_cbits = 2
            operations = [
                {"gate": "RY", "target": [0], "theta": theta},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "H", "target": [1]},
                {"gate": "CX", "control": 1, "target": 2},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "H", "target": [0]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 1, "target": 2},
                {"gate": "CZ", "control": 0, "target": 2}
            ]
            contract = {
                "teleportation_check": True
            }

        elif algo == "three_qubit_qec":
            name = "3-Qubit Bit-Flip QEC"
            num_qubits = 5
            num_cbits = 1
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "CX", "control": 0, "target": 2},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "X", "target": [1]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 0, "target": 3},
                {"gate": "CX", "control": 1, "target": 3},
                {"gate": "CX", "control": 1, "target": 4},
                {"gate": "CX", "control": 2, "target": 4},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "CCX", "control1": 3, "control2": 4, "target": 1},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "CX", "control": 0, "target": 2},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0}
            ]
            contract = {
                "qec_check": True
            }

        elif algo == "controlled_qft":
            name = "Controlled 3-Qubit QFT"
            num_qubits = 4
            num_cbits = 4
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "X", "target": [1]},
                {"gate": "X", "target": [3]},
                {"gate": "BARRIER", "target": list(range(4))},
                {"gate": "CH", "control": 0, "target": 1},
                {"gate": "CH", "control": 0, "target": 2},
                {"gate": "CH", "control": 0, "target": 3},
                {"gate": "CSWAP", "control": 0, "target": [1, 3]},
                {"gate": "BARRIER", "target": list(range(4))},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1},
                {"gate": "MEASURE", "qubit": 2, "cbit": 2},
                {"gate": "MEASURE", "qubit": 3, "cbit": 3}
            ]
            contract = {
                "controlled_qft_check": True
            }

        elif algo == "phase_kickback":
            name = "Phase Kickback Experiment"
            num_qubits = 2
            num_cbits = 2
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "X", "target": [1]},
                {"gate": "H", "target": [1]},
                {"gate": "BARRIER", "target": [0, 1]},
                {"gate": "CP", "control": 0, "target": 1, "theta": "pi/2"},
                {"gate": "BARRIER", "target": [0, 1]},
                {"gate": "RZ", "target": [0], "theta": "-pi/2"},
                {"gate": "BARRIER", "target": [0, 1]},
                {"gate": "H", "target": [0]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1}
            ]
            contract = {
                "kickback_check": True
            }

        elif algo == "grover_multi_target":
            name = "Grover (Two Targets: 011 and 110)"
            num_qubits = 3
            num_cbits = 3
            operations = [
                {"gate": "H", "target": [0]},
                {"gate": "H", "target": [1]},
                {"gate": "H", "target": [2]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "X", "target": [2]},
                {"gate": "H", "target": [2]},
                {"gate": "CCX", "control1": 0, "control2": 1, "target": 2},
                {"gate": "H", "target": [2]},
                {"gate": "X", "target": [2]},
                {"gate": "X", "target": [0]},
                {"gate": "H", "target": [2]},
                {"gate": "CCX", "control1": 0, "control2": 1, "target": 2},
                {"gate": "H", "target": [2]},
                {"gate": "X", "target": [0]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "H", "target": [0]},
                {"gate": "H", "target": [1]},
                {"gate": "H", "target": [2]},
                {"gate": "X", "target": [0]},
                {"gate": "X", "target": [1]},
                {"gate": "X", "target": [2]},
                {"gate": "H", "target": [2]},
                {"gate": "CCX", "control1": 0, "control2": 1, "target": 2},
                {"gate": "H", "target": [2]},
                {"gate": "X", "target": [0]},
                {"gate": "X", "target": [1]},
                {"gate": "X", "target": [2]},
                {"gate": "H", "target": [0]},
                {"gate": "H", "target": [1]},
                {"gate": "H", "target": [2]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1},
                {"gate": "MEASURE", "qubit": 2, "cbit": 2}
            ]
            contract = {
                "expected_bitstrings": ["011", "110"],
                "minimum_total_probability": 0.80
            }

        elif algo == "ripple_carry_adder":
            name = "2-Bit Ripple-Carry Adder"
            num_qubits = 5
            num_cbits = 5
            operations = [
                {"gate": "X", "target": [1]},
                {"gate": "X", "target": [2]},
                {"gate": "X", "target": [3]},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "CX", "control": 0, "target": 2},
                {"gate": "CCX", "control1": 1, "control2": 3, "target": 4},
                {"gate": "CX", "control": 1, "target": 3},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1},
                {"gate": "MEASURE", "qubit": 2, "cbit": 2},
                {"gate": "MEASURE", "qubit": 3, "cbit": 3},
                {"gate": "MEASURE", "qubit": 4, "cbit": 4}
            ]
            contract = {
                "expected_bitstring": "10110",
                "minimum_probability": 0.95
            }

        elif algo == "quantum_comparator":
            name = "Quantum Comparator"
            num_qubits = 5
            num_cbits = 1
            operations = [
                {"gate": "X", "target": [1]},
                {"gate": "X", "target": [2]},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "X", "target": [3]},
                {"gate": "CCX", "control1": 1, "control2": 3, "target": 4},
                {"gate": "X", "target": [3]},
                {"gate": "BARRIER", "target": list(range(5))},
                {"gate": "MEASURE", "qubit": 4, "cbit": 0}
            ]
            contract = {
                "expected_bitstring": "1",
                "minimum_probability": 0.95
            }

        elif algo == "vqe":
            name = "VQE Ansatz State"
            theta = float(params.get("theta") or 0.5)
            num_qubits = 2
            num_cbits = 2
            operations = [
                {"gate": "RY", "target": [0], "theta": str(theta)},
                {"gate": "RY", "target": [1], "theta": str(theta)},
                {"gate": "CX", "control": 0, "target": 1},
                {"gate": "BARRIER", "target": [0, 1]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1}
            ]
            contract = {
                "vqe_check": True
            }

        elif algo == "quantum_walk":
            name = "Quantum Walk on Cycle"
            num_qubits = 3
            num_cbits = 2
            operations = [
                {"gate": "H", "target": [2]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "CX", "control": 2, "target": 0},
                {"gate": "CCX", "control1": 2, "control2": 0, "target": 1},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "X", "target": [2]},
                {"gate": "CX", "control": 2, "target": 0},
                {"gate": "CCX", "control1": 2, "control2": 0, "target": 1},
                {"gate": "X", "target": [2]},
                {"gate": "BARRIER", "target": [0, 1, 2]},
                {"gate": "MEASURE", "qubit": 0, "cbit": 0},
                {"gate": "MEASURE", "qubit": 1, "cbit": 1}
            ]
            contract = {
                "walk_check": True
            }

        return {
            "num_qubits": num_qubits,
            "num_cbits": num_cbits,
            "operations": operations,
            "name": name,
            "algorithm": algo,
            "contract": contract
        }
