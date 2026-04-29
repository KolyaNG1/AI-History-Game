from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from backend.app.data.scenarios import SCENARIOS, SCENARIO_TREES
from backend.app.services.ml_bridge import MLBridge
from backend.app.services.session_store import InMemorySessionStore


class GameService:
    NOTE_REQUEST_MIN_USER_TURNS = 2

    def __init__(
        self,
        session_store: InMemorySessionStore,
        ml_bridge: MLBridge,
    ) -> None:
        self.session_store = session_store
        self.ml_bridge = ml_bridge

    def list_scenarios(self) -> list[dict]:
        return SCENARIOS

    def start_scenario(self, scenario_id: str) -> dict:
        scenario = self._find_scenario(scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")

        tree = SCENARIO_TREES.get(scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        start_node_id = tree["start_node_id"]
        session = self.session_store.create_session(
            scenario_id=scenario_id,
            start_node_id=start_node_id,
        )

        current_node = self._build_node_response(
            scenario_id=scenario_id,
            node_id=start_node_id,
        )

        return self._build_session_response(
            session_id=session.session_id,
            scenario_id=scenario["id"],
            current_node=current_node,
            scenario_title=scenario["title"],
        )

    def choose_action(self, session_id: str, choice_id: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        tree = SCENARIO_TREES.get(session.scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        current_node = tree["nodes"].get(session.current_node_id)
        if current_node is None:
            raise HTTPException(status_code=500, detail="Current node not found")

        selected_choice = None
        for choice in current_node["choices"]:
            if choice["id"] == choice_id:
                selected_choice = choice
                break

        if selected_choice is None:
            raise HTTPException(status_code=400, detail="Choice not found for current node")

        next_node_id = selected_choice["next_node_id"]
        if next_node_id not in tree["nodes"]:
            raise HTTPException(status_code=500, detail="Next node not found")

        updated_session = self.session_store.move_forward(session_id, next_node_id)
        if updated_session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        next_node = self._build_node_response(
            scenario_id=updated_session.scenario_id,
            node_id=updated_session.current_node_id,
        )

        scenario = self._find_scenario(updated_session.scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")

        return self._build_session_response(
            session_id=updated_session.session_id,
            scenario_id=updated_session.scenario_id,
            current_node=next_node,
            scenario_title=scenario["title"],
        )

    def get_node_by_id(self, session_id: str, node_id: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        tree = SCENARIO_TREES.get(session.scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        if node_id not in session.visited_node_ids:
            raise HTTPException(status_code=403, detail="Node has not been visited yet")

        if node_id not in tree["nodes"]:
            raise HTTPException(status_code=404, detail="Node not found")

        updated_session = self.session_store.jump_to_node(session_id, node_id)
        if updated_session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        node = self._build_node_response(
            scenario_id=updated_session.scenario_id,
            node_id=node_id,
        )

        scenario = self._find_scenario(updated_session.scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")

        return self._build_session_response(
            session_id=updated_session.session_id,
            scenario_id=updated_session.scenario_id,
            current_node=node,
            scenario_title=scenario["title"],
        )

    def start_node_dialogue(self, session_id: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        tree = SCENARIO_TREES.get(session.scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        current_node = tree["nodes"].get(session.current_node_id)
        if current_node is None:
            raise HTTPException(status_code=500, detail="Current node not found")

        choice_texts = [c["text"] for c in current_node.get("choices", [])]
        warmup_queue = self._build_warmup_queue_from_node(current_node)
        self.session_store.replace_warmup_state(session_id, warmup_queue, unlocked=0)

        opening = self.ml_bridge.build_dialogue_opening(
            scenario_id=session.scenario_id,
            node_id=session.current_node_id,
            node_title=current_node["title"],
            scene_text=current_node["scene_text"],
            choice_texts=choice_texts,
        )
        self.session_store.set_dialogue_messages(
            session_id,
            [{"role": "assistant", "content": opening}],
        )
        messages = self.session_store.get_dialogue_messages(session_id) or []
        return self._pack_node_dialogue_response(
            session_id=session_id,
            messages=messages,
            show_choices=False,
            newly_unlocked_note_ids=[],
        )

    def send_node_dialogue_message(self, session_id: str, user_message: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        tree = SCENARIO_TREES.get(session.scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        current_node = tree["nodes"].get(session.current_node_id)
        if current_node is None:
            raise HTTPException(status_code=500, detail="Current node not found")

        history_before = self.session_store.get_dialogue_messages(session_id)
        if history_before is None:
            raise HTTPException(status_code=404, detail="Session not found")
        if not history_before:
            raise HTTPException(
                status_code=400,
                detail="Dialogue not started; call /node/dialogue/start first",
            )

        self.session_store.append_dialogue_messages(
            session_id,
            {"role": "user", "content": user_message.strip()},
        )

        choice_texts = [c["text"] for c in current_node.get("choices", [])]
        assistant_text, show_choices = self.ml_bridge.build_dialogue_reply(
            scenario_id=session.scenario_id,
            node_id=session.current_node_id,
            history=history_before,
            user_message=user_message.strip(),
            node_title=current_node["title"],
            choice_texts=choice_texts,
        )
        if not choice_texts:
            show_choices = False

        self.session_store.append_dialogue_messages(
            session_id,
            {"role": "assistant", "content": assistant_text},
        )

        messages = self.session_store.get_dialogue_messages(session_id) or []
        return self._pack_node_dialogue_response(
            session_id=session_id,
            messages=messages,
            show_choices=show_choices,
            newly_unlocked_note_ids=[],
        )

    def request_node_warmup_note(self, session_id: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        tree = SCENARIO_TREES.get(session.scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        current_node = tree["nodes"].get(session.current_node_id)
        if current_node is None:
            raise HTTPException(status_code=500, detail="Current node not found")

        history = self.session_store.get_dialogue_messages(session_id)
        if history is None:
            raise HTTPException(status_code=404, detail="Session not found")
        if not history:
            raise HTTPException(
                status_code=400,
                detail="Dialogue not started; call /node/dialogue/start first",
            )

        user_turns = self._count_user_turns(history)
        if user_turns < self.NOTE_REQUEST_MIN_USER_TURNS:
            remaining = self.NOTE_REQUEST_MIN_USER_TURNS - user_turns
            self.session_store.append_dialogue_messages(
                session_id,
                {
                    "role": "assistant",
                    "content": (
                        "Пока рано открывать подсказки. "
                        f"Давайте ещё немного обсудим ситуацию: задайте ещё {remaining} "
                        f"{'вопрос' if remaining == 1 else 'вопроса'}."
                    ),
                },
            )
            messages = self.session_store.get_dialogue_messages(session_id) or []
            return self._pack_node_dialogue_response(
                session_id=session_id,
                messages=messages,
                show_choices=False,
                newly_unlocked_note_ids=[],
            )

        bump = self.session_store.bump_warmup_unlocked(session_id, 1)
        newly_unlocked_ids = bump[2] if bump else []
        if newly_unlocked_ids:
            self.session_store.append_dialogue_messages(
                session_id,
                {
                    "role": "assistant",
                    "content": "Открыл следующую заметку. Изучите её и продолжим разбор.",
                },
            )
        else:
            self.session_store.append_dialogue_messages(
                session_id,
                {
                    "role": "assistant",
                    "content": "Все заметки на этом узле уже открыты. Можем перейти к решению.",
                },
            )

        messages = self.session_store.get_dialogue_messages(session_id) or []
        show_choices = bool(current_node.get("choices"))
        return self._pack_node_dialogue_response(
            session_id=session_id,
            messages=messages,
            show_choices=show_choices,
            newly_unlocked_note_ids=newly_unlocked_ids,
        )

    def go_back(self, session_id: str) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        updated_session = self.session_store.go_back(session_id)
        if updated_session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        node = self._build_node_response(
            scenario_id=updated_session.scenario_id,
            node_id=updated_session.current_node_id,
        )

        scenario = self._find_scenario(updated_session.scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")

        return self._build_session_response(
            session_id=updated_session.session_id,
            scenario_id=updated_session.scenario_id,
            current_node=node,
            scenario_title=scenario["title"],
        )

    def _build_session_response(
        self,
        session_id: str,
        scenario_id: str,
        current_node: dict,
        scenario_title: str,
    ) -> dict:
        session = self.session_store.get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session.session_id,
            "scenario_id": scenario_id,
            "scenario_title": scenario_title,
            "current_node": current_node,
            "path_node_ids": session.path_node_ids,
            "visited_node_ids": session.visited_node_ids,
            "tree_nodes": self._build_tree_nodes(scenario_id),
        }

    def _build_tree_nodes(self, scenario_id: str) -> list[dict]:
        tree = SCENARIO_TREES.get(scenario_id)
        if tree is None:
            return []

        result = []
        for node in tree["nodes"].values():
            result.append(
                {
                    "id": node["id"],
                    "title": node["title"],
                    "next_node_ids": [choice["next_node_id"] for choice in node["choices"]],
                }
            )
        return result

    def _build_node_response(self, scenario_id: str, node_id: str) -> dict:
        tree = SCENARIO_TREES.get(scenario_id)
        if tree is None:
            raise HTTPException(status_code=400, detail="Scenario tree is not configured")

        node = tree["nodes"].get(node_id)
        if node is None:
            raise HTTPException(status_code=404, detail="Node not found")

        ai_response = self.ml_bridge.build_node_response(
            scenario_id=scenario_id,
            node_id=node_id,
        )

        return {
            "id": node["id"],
            "title": node["title"],
            "scene_text": node["scene_text"],
            "ai_response": ai_response,
            "choices": [
                {
                    "id": choice["id"],
                    "text": choice["text"],
                }
                for choice in node["choices"]
            ],
        }

    @staticmethod
    def _find_scenario(scenario_id: str) -> dict | None:
        for scenario in SCENARIOS:
            if scenario["id"] == scenario_id:
                return scenario
        return None

    @staticmethod
    def _note_raw_to_parts(note: dict[str, Any]) -> list[dict[str, Any]]:
        """Собирает parts для API: либо явный массив parts в JSON, либо legacy поле content."""
        raw_parts = note.get("parts")
        if isinstance(raw_parts, list) and raw_parts:
            out: list[dict[str, Any]] = []
            for p in raw_parts:
                if not isinstance(p, dict):
                    continue
                modality = p.get("modality") or p.get("type") or "unknown"
                if modality not in ("text", "image", "audio", "file", "unknown"):
                    modality = "unknown"
                out.append(
                    {
                        "modality": modality,
                        "text": p.get("text"),
                        "url": p.get("url"),
                        "alt": p.get("alt"),
                        "mime_type": p.get("mime_type"),
                        "meta": p.get("meta") if isinstance(p.get("meta"), dict) else {},
                    }
                )
            return out

        content = note.get("content")
        if content is not None:
            return [
                {
                    "modality": "text",
                    "text": str(content),
                    "url": None,
                    "alt": None,
                    "mime_type": None,
                    "meta": {},
                }
            ]
        return []

    @classmethod
    def _build_warmup_queue_from_node(cls, node: dict[str, Any]) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for choice in node.get("choices") or []:
            cid = choice["id"]
            for idx, note in enumerate(choice.get("notes_to_warm_up") or []):
                if not isinstance(note, dict):
                    continue
                nid = f"{cid}__warmup__{idx}"
                parts = cls._note_raw_to_parts(note)
                if not parts:
                    parts = [
                        {
                            "modality": "text",
                            "text": "",
                            "url": None,
                            "alt": None,
                            "mime_type": None,
                            "meta": {},
                        }
                    ]
                out.append(
                    {
                        "id": nid,
                        "note_type": str(note.get("type", "unknown")),
                        "description": str(note.get("description", "")),
                        "source_choice_id": cid,
                        "parts": parts,
                    }
                )
        return out

    def _pack_node_dialogue_response(
        self,
        session_id: str,
        messages: list[dict[str, Any]],
        show_choices: bool,
        newly_unlocked_note_ids: list[str],
    ) -> dict[str, Any]:
        warmup_notes = self.session_store.get_unlocked_warmup_notes(session_id) or []
        warmup_progress = self.session_store.get_warmup_progress(session_id)
        unlocked_count, total_count = warmup_progress if warmup_progress else (0, 0)
        user_turns_count = self._count_user_turns(messages)
        return {
            "messages": messages,
            "show_choices": show_choices,
            "user_turns_count": user_turns_count,
            "note_request_min_user_turns": self.NOTE_REQUEST_MIN_USER_TURNS,
            "has_more_warmup_notes": unlocked_count < total_count,
            "warmup_notes": warmup_notes,
            "newly_unlocked_note_ids": newly_unlocked_note_ids,
        }

    @staticmethod
    def _count_user_turns(messages: list[dict[str, Any]]) -> int:
        return sum(1 for m in messages if m.get("role") == "user")