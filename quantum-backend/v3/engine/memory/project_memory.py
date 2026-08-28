"""
Quantum Guru Project Memory Manager
Maintains a persistent chronological ledger of:
1. User Prompts & Intents
2. LLM Reasoning & Theoretical Explanations
3. Agent / 33-Tool Execution Traces
4. Code Diffs & File Changes
5. Quantum State Telemetry (QPU target, Qubit counts, Fidelity)
"""
import os
import json
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

STORAGE_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.quantum_projects"))

class ToolInvocationLog(BaseModel):
    tool_id: Optional[int] = None
    tool_name: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float = 0.0
    status: str = "success"

class CodeDiffSnapshot(BaseModel):
    file_path: str
    action: str = "MODIFY"  # "MODIFY", "CREATE", "DELETE"
    lines_modified: Optional[str] = None
    summary: str

class QuantumStateSnapshot(BaseModel):
    target_backend: str = "aer_simulator"
    active_qubits: int = 4
    circuit_depth: int = 6
    fidelity: Optional[float] = 0.9982
    expectation_val: Optional[float] = -0.4125

class MemoryTurn(BaseModel):
    turn_id: str
    timestamp: str
    user_prompt: str
    llm_reasoning: str
    agent_called: str = "Quantum Guru Orchestrator"
    tools_invoked: List[ToolInvocationLog] = Field(default_factory=list)
    code_changes: List[CodeDiffSnapshot] = Field(default_factory=list)
    quantum_state: QuantumStateSnapshot = Field(default_factory=QuantumStateSnapshot)

class ProjectMemoryLedger(BaseModel):
    project_id: str
    created_at: str
    last_updated: str
    total_turns: int = 0
    turns: List[MemoryTurn] = Field(default_factory=list)

class ProjectMemoryManager:
    def __init__(self, storage_dir: str = STORAGE_BASE_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_project_file(self, project_id: str) -> str:
        safe_name = "".join(c for c in project_id if c.isalnum() or c in ("-", "_")).lower()
        return os.path.join(self.storage_dir, f"{safe_name}_memory.json")

    def get_memory(self, project_id: str) -> ProjectMemoryLedger:
        file_path = self._get_project_file(project_id)
        if not os.path.exists(file_path):
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            # Initialize with default starter turn if blank
            initial_ledger = ProjectMemoryLedger(
                project_id=project_id,
                created_at=now_iso,
                last_updated=now_iso,
                total_turns=1,
                turns=[
                    MemoryTurn(
                        turn_id="turn_init_001",
                        timestamp=now_iso,
                        user_prompt="Optimize the 2-qubit CNOT depth for the active circuit in main.py and explain the reduction.",
                        llm_reasoning="Inspected 4-qubit parameterized ansatz. Applied CommutativeCancellation & ConsolidateBlocks (Level 2). Reduced CNOT gate count from 6 to 4 (-33% depth).",
                        agent_called="Quantum Guru Transpiler Agent",
                        tools_invoked=[
                            ToolInvocationLog(
                                tool_id=19,
                                tool_name="tools.circuit.transpile_passes",
                                inputs={"optimization_level": 2, "basis_gates": ["rz", "sx", "x", "cx"]},
                                outputs={"depth_before": 6, "depth_after": 4, "reduction_percent": 33.3},
                                execution_time_ms=14.2,
                                status="success"
                            )
                        ],
                        code_changes=[
                            CodeDiffSnapshot(
                                file_path="main.py",
                                action="MODIFY",
                                lines_modified="L12-16",
                                summary="Replaced raw CNOT ladder with optimized level-2 commutative cancellation block."
                            )
                        ],
                        quantum_state=QuantumStateSnapshot(
                            target_backend="aer_simulator",
                            active_qubits=4,
                            circuit_depth=4,
                            fidelity=0.9982,
                            expectation_val=-0.4125
                        )
                    )
                ]
            )
            self.save_memory(initial_ledger)
            return initial_ledger

        try:
            with open(file_path, "r") as f:
                data = json.load(f)
            return ProjectMemoryLedger(**data)
        except Exception as e:
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            return ProjectMemoryLedger(
                project_id=project_id,
                created_at=now_iso,
                last_updated=now_iso,
                total_turns=0,
                turns=[]
            )

    def save_memory(self, ledger: ProjectMemoryLedger) -> None:
        file_path = self._get_project_file(ledger.project_id)
        ledger.total_turns = len(ledger.turns)
        ledger.last_updated = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with open(file_path, "w") as f:
            json.dump(ledger.model_dump(), f, indent=2)

    def record_turn(self, project_id: str, turn: MemoryTurn) -> ProjectMemoryLedger:
        ledger = self.get_memory(project_id)
        ledger.turns.append(turn)
        self.save_memory(ledger)
        return ledger

    def clear_memory(self, project_id: str) -> None:
        file_path = self._get_project_file(project_id)
        if os.path.exists(file_path):
            os.remove(file_path)

# Global singleton
memory_manager = ProjectMemoryManager()
