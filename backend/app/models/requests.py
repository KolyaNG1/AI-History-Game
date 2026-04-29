from pydantic import BaseModel, Field


class StartScenarioRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario identifier")


class ChooseActionRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    choice_id: str = Field(..., description="Choice identifier")


class NodeDialogueStartRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")


class NodeDialogueMessageRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., min_length=1, max_length=8000, description="User message to facilitator")


class NodeDialogueNoteRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")