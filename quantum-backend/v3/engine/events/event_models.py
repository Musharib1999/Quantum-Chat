"""
Quantum Guru V4 - Event & Action/Observation Models
Inspired by OpenHands V1 Event-Driven Agent Architecture.
"""
import time
import uuid
from typing import Dict, Any, List, Optional, Union, Literal
from pydantic import BaseModel, Field


# =====================================================================
# 1. BASE EVENT
# =====================================================================
class Event(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    timestamp: str = Field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    project_id: str = "default-project"
    session_id: str = "default-session"
    source: Literal["user", "agent", "runtime", "system"] = "agent"
    event_type: str = "generic_event"


# =====================================================================
# 2. ACTIONS (Agent & User Decisions)
# =====================================================================
class UserMessageAction(Event):
    source: Literal["user"] = "user"
    event_type: Literal["user_message"] = "user_message"
    message: str
    active_file: str = "main.py"


class AgentThoughtAction(Event):
    source: Literal["agent"] = "agent"
    event_type: Literal["agent_thought"] = "agent_thought"
    thought: str
    intent_domain: str = "general"  # optimization, chemistry, algorithms, circuits, qml, academy
    confidence: float = 1.0


class ToolCallAction(Event):
    source: Literal["agent"] = "agent"
    event_type: Literal["tool_call"] = "tool_call"
    tool_name: str
    tool_id: Optional[int] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    rationale: str = ""


class CodeEditAction(Event):
    source: Literal["agent"] = "agent"
    event_type: Literal["code_edit"] = "code_edit"
    file_path: str
    action_type: Literal["CREATE", "MODIFY", "DELETE"] = "MODIFY"
    replacement_content: str
    rationale: str = ""


class ClarificationPromptAction(Event):
    source: Literal["agent"] = "agent"
    event_type: Literal["clarification_prompt"] = "clarification_prompt"
    question: str
    domain: str
    scenario_id: str
    options: List[Dict[str, Any]] = Field(default_factory=list)
    default_value: Optional[str] = None


class FinalResponseAction(Event):
    source: Literal["agent"] = "agent"
    event_type: Literal["final_response"] = "final_response"
    response_text: str
    scientific_verdict: Optional[str] = None
    clarification: Optional[Dict[str, Any]] = None


# =====================================================================
# 3. OBSERVATIONS (Runtime & Tool Feedback)
# =====================================================================
class ToolObservation(Event):
    source: Literal["runtime"] = "runtime"
    event_type: Literal["tool_observation"] = "tool_observation"
    tool_name: str
    tool_call_id: Optional[str] = None
    status: Literal["success", "error", "warning"] = "success"
    execution_time_ms: float = 0.0
    outputs: Dict[str, Any] = Field(default_factory=dict)
    summary: str = ""


class QuantumExecutionObservation(Event):
    source: Literal["runtime"] = "runtime"
    event_type: Literal["quantum_execution_observation"] = "quantum_execution_observation"
    backend: str = "aer_simulator"
    active_qubits: int = 0
    circuit_depth: int = 0
    cnot_count: int = 0
    fidelity: Optional[float] = 1.0
    expectation_val: Optional[Union[float, str]] = None
    circuit_ascii: str = ""
    terminal_log: List[str] = Field(default_factory=list)
    execution_time_ms: float = 0.0
    converged: bool = True
    error_mHa: Optional[float] = None


class CodeEditObservation(Event):
    source: Literal["runtime"] = "runtime"
    event_type: Literal["code_edit_observation"] = "code_edit_observation"
    file_path: str
    lines_added: int = 0
    lines_removed: int = 0
    total_lines: int = 0
    status: Literal["applied", "failed"] = "applied"
    summary: str = ""


class ErrorObservation(Event):
    source: Literal["runtime"] = "runtime"
    event_type: Literal["error_observation"] = "error_observation"
    error_type: str
    error_message: str
    mitigation_suggestion: Optional[str] = None
