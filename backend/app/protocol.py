from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

PROTOCOL_VERSION = "1.0.0"

class Role(str, Enum):
    OPERATOR = "operator"
    NODE = "node"

class MessageType(str, Enum):
    HELLO = "HELLO"
    PAIR = "PAIR"
    HEARTBEAT = "HEARTBEAT"
    NODE_READY = "NODE_READY"
    START_PROFILE = "START_PROFILE"
    INJECT_INSTABILITY = "INJECT_INSTABILITY"
    MITIGATION_COMMAND = "MITIGATION_COMMAND"
    COMMAND_ACK = "COMMAND_ACK"
    SAFE_HOLD = "SAFE_HOLD"
    ERROR = "ERROR"

class BaseMessage(BaseModel):
    version: str = Field(default=PROTOCOL_VERSION)
    type: MessageType
    room_id: str
    sender_role: Optional[Role] = None
    timestamp: float

class HelloMessage(BaseMessage):
    type: Literal[MessageType.HELLO] = MessageType.HELLO
    client_id: str
    role: Role

class PairMessage(BaseMessage):
    type: Literal[MessageType.PAIR] = MessageType.PAIR
    role: Role
    paired: bool
    peers: List[str] = Field(default_factory=list)

class HeartbeatMessage(BaseMessage):
    type: Literal[MessageType.HEARTBEAT] = MessageType.HEARTBEAT
    seq: int
    interval_ms: int = 500

class NodeReadyMessage(BaseMessage):
    type: Literal[MessageType.NODE_READY] = MessageType.NODE_READY
    armed: bool
    label: str = "BENCH MACHINE NODE"

class StartProfileMessage(BaseMessage):
    type: Literal[MessageType.START_PROFILE] = MessageType.START_PROFILE
    profile_type: str = "NOMINAL"
    parameters: Dict[str, Any] = Field(default_factory=dict)

class InjectInstabilityMessage(BaseMessage):
    type: Literal[MessageType.INJECT_INSTABILITY] = MessageType.INJECT_INSTABILITY
    active: bool
    incident_id: str
    target_freq_hz: float = 2400.0

class MitigationCommandMessage(BaseMessage):
    type: Literal[MessageType.MITIGATION_COMMAND] = MessageType.MITIGATION_COMMAND
    command_id: str
    reduction_ratio: float = 0.5
    ramp_ms: int = 250
    dither_hz: float = 40.0
    reason: str = "MANUAL_RUN_1"

class CommandAckMessage(BaseMessage):
    type: Literal[MessageType.COMMAND_ACK] = MessageType.COMMAND_ACK
    command_id: str
    applied: bool
    state_after: str
    latency_ms: Optional[float] = None

class SafeHoldMessage(BaseMessage):
    type: Literal[MessageType.SAFE_HOLD] = MessageType.SAFE_HOLD
    reason: str
    last_heartbeat_age_ms: float

class ErrorMessage(BaseMessage):
    type: Literal[MessageType.ERROR] = MessageType.ERROR
    code: str
    message: str