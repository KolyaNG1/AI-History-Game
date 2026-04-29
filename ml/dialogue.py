"""
Заглушки диалога ИИ-ведущего на узле графа.

Сюда позже подключается вызов LLM: на вход — контекст узла, варианты решений,
история сообщений; на выход — реплика ассистента и флаг готовности к выбору.
"""

from __future__ import annotations

from typing import Any


def dialogue_opening(
    scenario_id: str,
    node_id: str,
    node_title: str,
    scene_text: str,
    choice_texts: list[str],
) -> str:
    """Первая реплика ведущего при входе на узел (stub)."""
    preview = ""
    if choice_texts:
        preview = (
            " Доступные направления решения (без спешки обсудим): "
            + "; ".join(f"«{t}»" for t in choice_texts[:5])
        )
        if len(choice_texts) > 5:
            preview += "…"
    return (
        f"[ИИ-ведущий, заглушка] Вы в узле «{node_title}». "
        f"Кратко: {scene_text[:280]}{'…' if len(scene_text) > 280 else ''}"
        f"{preview} "
        "Задавайте вопросы — позже я попрошу зафиксировать решение."
    )


def dialogue_reply(
    scenario_id: str,
    node_id: str,
    history: list[dict[str, Any]],
    user_message: str,
    node_title: str,
    choice_texts: list[str],
) -> tuple[str, bool]:
    """
    Ответ на реплику игрока.

    Возвращает (текст_ассистента, показывать_ли_кнопки_выбора).
    Заглушка: после двух сообщений пользователя в истории узла разрешаем выбор.
    """
    prior_user = sum(1 for m in history if m.get("role") == "user")
    user_turn = prior_user + 1

    snippet = user_message.strip()[:200] or "(пустое сообщение)"
    reply = (
        f"[ИИ-ведущий, заглушка] Учёл ваш запрос про «{snippet}». "
        f"(сценарий={scenario_id}, узел={node_id}) "
        "В реальной версии здесь будет ответ LLM в роли ведущего, "
        "с опорой на факты узла и границы сценария."
    )
    if choice_texts and user_turn >= 2:
        reply += (
            " Время принять решение: выберите один из вариантов ниже — "
            "это переведёт вас на следующий узел графа."
        )
        return reply, True

    reply += " Расскажите подробнее или уточните, что вас беспокоит."
    return reply, False
