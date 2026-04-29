from fastapi import APIRouter, Query

from backend.app.models.requests import (
    ChooseActionRequest,
    NodeDialogueMessageRequest,
    NodeDialogueNoteRequest,
    NodeDialogueStartRequest,
    StartScenarioRequest,
)
from backend.app.models.responses import (
    NodeDialogueStateResponse,
    ScenarioResponse,
    StartScenarioResponse,
    ChooseActionResponse,
)
from backend.app.services.game_service import GameService
from backend.app.services.ml_bridge import MLBridge
from backend.app.services.session_store import InMemorySessionStore

router = APIRouter(prefix="/api", tags=["history-simulator"])

session_store = InMemorySessionStore()
ml_bridge = MLBridge()
game_service = GameService(
    session_store=session_store,
    ml_bridge=ml_bridge,
)


@router.get("/health")
def healthcheck():
    return {"status": "ok"}


@router.get("/scenarios", response_model=list[ScenarioResponse])
def get_scenarios():
    return game_service.list_scenarios()


@router.post("/scenarios/start", response_model=StartScenarioResponse)
def start_scenario(payload: StartScenarioRequest):
    return game_service.start_scenario(payload.scenario_id)


@router.post("/turn/choose", response_model=ChooseActionResponse)
def choose_action(payload: ChooseActionRequest):
    return game_service.choose_action(
        session_id=payload.session_id,
        choice_id=payload.choice_id,
    )


@router.post("/node/dialogue/start", response_model=NodeDialogueStateResponse)
def start_node_dialogue(payload: NodeDialogueStartRequest):
    return game_service.start_node_dialogue(payload.session_id)


@router.post("/node/dialogue/message", response_model=NodeDialogueStateResponse)
def node_dialogue_message(payload: NodeDialogueMessageRequest):
    return game_service.send_node_dialogue_message(
        session_id=payload.session_id,
        user_message=payload.message,
    )


@router.post("/node/dialogue/note", response_model=NodeDialogueStateResponse)
def node_dialogue_note(payload: NodeDialogueNoteRequest):
    return game_service.request_node_warmup_note(payload.session_id)


@router.get("/node", response_model=ChooseActionResponse)
def get_node(
    session_id: str = Query(...),
    node_id: str = Query(...),
):
    return game_service.get_node_by_id(
        session_id=session_id,
        node_id=node_id,
    )


@router.post("/turn/back", response_model=ChooseActionResponse)
def go_back(session_id: str = Query(...)):
    return game_service.go_back(session_id=session_id)