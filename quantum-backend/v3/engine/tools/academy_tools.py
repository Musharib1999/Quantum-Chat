"""
Academy Studio Tools (Tools 07 - 11)
"""
from qiskit import QuantumCircuit
from .tool_models import (
    AcademyConceptExplainerRequest, AcademyConceptExplainerResponse,
    AcademyMathDerivationRequest, AcademyMathDerivationResponse,
    AcademyGenerateTutorialCircuitRequest, AcademyGenerateTutorialCircuitResponse,
    AcademySocraticAssessmentRequest, AcademySocraticAssessmentResponse,
    AcademyMisconceptionDebuggerRequest, AcademyMisconceptionDebuggerResponse
)

def concept_explainer(req: AcademyConceptExplainerRequest) -> AcademyConceptExplainerResponse:
    return AcademyConceptExplainerResponse(
        concept_title=f"Fundamentals of {req.topic}",
        physical_intuition=f"In quantum mechanics, {req.topic} represents state superposition and non-local phase correlations.",
        computational_significance="Enables exponential state space parallelism across 2^N basis states.",
        key_takeaways=[
            "Superposition is continuous until projective measurement.",
            "Phase kickback transfers eigenvalue information to control qubits.",
            "Unitary gates are reversible operations (U^dag U = I)."
        ]
    )

def math_derivation(req: AcademyMathDerivationRequest) -> AcademyMathDerivationResponse:
    return AcademyMathDerivationResponse(
        latex_derivation=[
            r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle",
            r"H|0\rangle = \frac{|0\rangle + |1\rangle}{\sqrt{2}}",
            r"CNOT(H|0\rangle \otimes |0\rangle) = \frac{|00\rangle + |11\rangle}{\sqrt{2}}"
        ],
        matrix_representation=[
            ["1/sqrt(2)", "1/sqrt(2)"],
            ["1/sqrt(2)", "-1/sqrt(2)"]
        ],
        intermediate_statevectors=[
            "|00>: 0.7071",
            "|11>: 0.7071"
        ]
    )

def generate_tutorial_circuit(req: AcademyGenerateTutorialCircuitRequest) -> AcademyGenerateTutorialCircuitResponse:
    qc = QuantumCircuit(req.num_qubits)
    qc.h(0)
    if req.num_qubits > 1:
        qc.cx(0, 1)
    return AcademyGenerateTutorialCircuitResponse(
        qiskit_code=f"from qiskit import QuantumCircuit\nqc = QuantumCircuit({req.num_qubits})\nqc.h(0)\nqc.cx(0, 1)\n",
        ascii_circuit=str(qc.draw(output='text', fold=-1)),
        state_evolution_steps=[
            {"step": 1, "gate": "H(0)", "state": "|+0> = 1/sqrt(2)(|00> + |10>)"},
            {"step": 2, "gate": "CX(0, 1)", "state": "|Phi+> = 1/sqrt(2)(|00> + |11>)"}
        ]
    )

def socratic_assessment(req: AcademySocraticAssessmentRequest) -> AcademySocraticAssessmentResponse:
    return AcademySocraticAssessmentResponse(
        question_text="What is the result of applying a Hadamard gate twice in succession (H * H)?",
        options=[
            "Pauli-X (Bit Flip)",
            "Identity Matrix (I) — Restores Original State",
            "Phase Flip (Z)",
            "Bell State"
        ],
        correct_option_index=1,
        hint="Hadamard is an Hermitian and Unitary operator (H = H^dag = H^-1).",
        explanation="Because H is self-inverse (H^2 = I), applying it twice returns the qubit to its initial state."
    )

def misconception_debugger(req: AcademyMisconceptionDebuggerRequest) -> AcademyMisconceptionDebuggerResponse:
    return AcademyMisconceptionDebuggerResponse(
        has_misconception=True,
        misconception_type="Entanglement Superluminal Signaling",
        clarification="Quantum entanglement causes non-local correlation, but cannot transmit information faster than light because individual measurement outcomes remain purely random without a classical channel.",
        corrected_code_or_proof="No-Communication Theorem: Tr_B(U rho U^dag) = Tr_B(rho) for all local unitaries U."
    )
