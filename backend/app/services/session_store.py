from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Dict, List
from uuid import uuid4


@dataclass
class SessionState:
    session_id: str
    scenario_id: str
    current_node_id: str
    path_node_ids: List[str] = field(default_factory=list)
    visited_node_ids: List[str] = field(default_factory=list)
    # История диалога с ИИ-ведущим на текущем узле (сбрасывается при смене узла).
    dialogue_messages: List[Dict[str, Any]] = field(default_factory=list)
    # Заметки прогрева из choices[].notes_to_warm_up (порядок обхода — как в JSON).
    dialogue_warmup_queue: List[Dict[str, Any]] = field(default_factory=list)
    # Сколько первых заметок из очереди уже «открыты» для кнопок после ответов ведущего.
    dialogue_warmup_unlocked: int = 0


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: Dict[str, SessionState] = {}
        self._lock = Lock()
        # print("InMemorySessionStore initialized")

    def create_session(self, scenario_id: str, start_node_id: str) -> SessionState:
        with self._lock:
            session = SessionState(
                session_id=str(uuid4()),
                scenario_id=scenario_id,
                current_node_id=start_node_id,
                path_node_ids=[start_node_id],
                visited_node_ids=[start_node_id],
            )
            self._sessions[session.session_id] = session
            return session

    def get_session(self, session_id: str) -> SessionState | None:
        with self._lock:
            return self._sessions.get(session_id)

    def move_forward(self, session_id: str, node_id: str) -> SessionState | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            if session.current_node_id != node_id:
                session.dialogue_messages = []
                session.dialogue_warmup_queue = []
                session.dialogue_warmup_unlocked = 0

            session.current_node_id = node_id
            session.path_node_ids.append(node_id)

            if node_id not in session.visited_node_ids:
                session.visited_node_ids.append(node_id)

            return session

    def jump_to_node(self, session_id: str, node_id: str) -> SessionState | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            if session.current_node_id != node_id:
                session.dialogue_messages = []
                session.dialogue_warmup_queue = []
                session.dialogue_warmup_unlocked = 0

            session.current_node_id = node_id
            session.path_node_ids.append(node_id)

            if node_id not in session.visited_node_ids:
                session.visited_node_ids.append(node_id)

            return session

    def go_back(self, session_id: str) -> SessionState | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            if len(session.path_node_ids) <= 1:
                return session

            session.path_node_ids.pop()
            session.current_node_id = session.path_node_ids[-1]
            session.dialogue_messages = []
            session.dialogue_warmup_queue = []
            session.dialogue_warmup_unlocked = 0
            return session

    def set_dialogue_messages(self, session_id: str, messages: List[Dict[str, Any]]) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            session.dialogue_messages = list(messages)
            return True

    def append_dialogue_messages(
        self,
        session_id: str,
        *items: Dict[str, Any],
    ) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            for item in items:
                session.dialogue_messages.append(dict(item))
            return True

    def get_dialogue_messages(self, session_id: str) -> List[Dict[str, Any]] | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            return [dict(m) for m in session.dialogue_messages]

    def replace_warmup_state(
        self,
        session_id: str,
        queue: List[Dict[str, Any]],
        unlocked: int,
    ) -> bool:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            session.dialogue_warmup_queue = [dict(n) for n in queue]
            nlen = len(session.dialogue_warmup_queue)
            session.dialogue_warmup_unlocked = max(0, min(unlocked, nlen))
            return True

    def bump_warmup_unlocked(self, session_id: str, delta: int = 1) -> tuple[int, int, List[str]] | None:
        """Возвращает (было_открыто, стало_открыто, id_новых_заметок) или None."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            prev = session.dialogue_warmup_unlocked
            nlen = len(session.dialogue_warmup_queue)
            new_u = min(prev + delta, nlen)
            session.dialogue_warmup_unlocked = new_u
            new_ids = [session.dialogue_warmup_queue[i]["id"] for i in range(prev, new_u)]
            return prev, new_u, new_ids

    def get_unlocked_warmup_notes(self, session_id: str) -> List[Dict[str, Any]] | None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            k = session.dialogue_warmup_unlocked
            return [dict(n) for n in session.dialogue_warmup_queue[:k]]

    def get_warmup_progress(self, session_id: str) -> tuple[int, int] | None:
        """Возвращает (unlocked_count, total_count) или None."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            return session.dialogue_warmup_unlocked, len(session.dialogue_warmup_queue)