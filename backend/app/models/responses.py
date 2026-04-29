from typing import Any, Literal

from pydantic import BaseModel, Field


class WarmupNotePartResponse(BaseModel):
    """Фрагмент заметки: сейчас в основном текст; позже — изображения, аудио и т.д."""

    modality: Literal["text", "image", "audio", "file", "unknown"] = "text"
    text: str | None = None
    url: str | None = None
    alt: str | None = None
    mime_type: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class WarmupNoteResponse(BaseModel):
    """Заметка прогрева из notes_to_warm_up (мультимодальная модель через parts)."""

    id: str
    note_type: str
    description: str
    source_choice_id: str | None = None
    parts: list[WarmupNotePartResponse] = Field(default_factory=list)


class ChoiceResponse(BaseModel):
    id: str
    text: str


class NodeResponse(BaseModel):
    id: str
    title: str
    scene_text: str
    ai_response: str
    choices: list[ChoiceResponse]


class ScenarioResponse(BaseModel):
    id: str
    title: str
    period: str
    description: str


class StartScenarioResponse(BaseModel):
    session_id: str
    scenario_id: str
    scenario_title: str
    current_node: NodeResponse
    path_node_ids: list[str]
    visited_node_ids: list[str]
    tree_nodes: list[dict]


class ChooseActionResponse(BaseModel):
    session_id: str
    scenario_id: str
    current_node: NodeResponse
    path_node_ids: list[str]
    visited_node_ids: list[str]
    tree_nodes: list[dict]


class DialogueMessageResponse(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class NodeDialogueStateResponse(BaseModel):
    messages: list[DialogueMessageResponse]
    show_choices: bool
    user_turns_count: int = 0
    note_request_min_user_turns: int = 2
    has_more_warmup_notes: bool = False
    warmup_notes: list[WarmupNoteResponse] = Field(
        default_factory=list,
        description="Все уже открытые заметки на этом узле (кумулятивно).",
    )
    newly_unlocked_note_ids: list[str] = Field(
        default_factory=list,
        description="Id заметок, открытых после последнего ответа ведущего (для подсветки в UI).",
    )