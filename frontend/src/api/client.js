/** В dev Vite проксирует /api → backend (тот же origin, без CORS). В prod — прямой URL или VITE_API_URL. */
const API_BASE = (() => {
  const explicit = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (explicit) return `${explicit}/api`;
  if (import.meta.env.DEV) return "/api";
  return "http://127.0.0.1:8000/api";
})();

export async function fetchScenarios() {
  const response = await fetch(`${API_BASE}/scenarios`);
  if (!response.ok) {
    throw new Error("Не удалось получить список сценариев");
  }
  return response.json();
}

export async function startScenario(scenarioId) {
  const response = await fetch(`${API_BASE}/scenarios/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scenario_id: scenarioId,
    }),
  });

  if (!response.ok) {
    throw new Error("Не удалось запустить сценарий");
  }

  return response.json();
}

export async function chooseAction(sessionId, choiceId) {
  const response = await fetch(`${API_BASE}/turn/choose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      choice_id: choiceId,
    }),
  });

  if (!response.ok) {
    throw new Error("Не удалось выполнить действие");
  }

  return response.json();
}

export async function loadVisitedNode(sessionId, nodeId) {
  const params = new URLSearchParams({
    session_id: sessionId,
    node_id: nodeId,
  });
  const response = await fetch(`${API_BASE}/node?${params}`);
  if (!response.ok) {
    throw new Error("Не удалось загрузить узел");
  }

  return response.json();
}

export async function goBack(sessionId) {
  const params = new URLSearchParams({ session_id: sessionId });
  const response = await fetch(`${API_BASE}/turn/back?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Не удалось вернуться назад");
  }

  return response.json();
}

/** Старт диалога с ИИ-ведущим на текущем узле сессии. */
export async function startNodeDialogue(sessionId) {
  const response = await fetch(`${API_BASE}/node/dialogue/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!response.ok) {
    throw new Error("Не удалось начать диалог на узле");
  }
  return response.json();
}

/** Сообщение ведущему; ответ и флаг «пора выбирать решение». */
export async function sendNodeDialogueMessage(sessionId, message) {
  const response = await fetch(`${API_BASE}/node/dialogue/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!response.ok) {
    throw new Error("Не удалось отправить сообщение");
  }
  return response.json();
}

/** Запросить следующую заметку прогрева на текущем узле. */
export async function requestNodeWarmupNote(sessionId) {
  const response = await fetch(`${API_BASE}/node/dialogue/note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!response.ok) {
    throw new Error("Не удалось получить заметку");
  }
  return response.json();
}