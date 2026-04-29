import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestNodeWarmupNote,
  sendNodeDialogueMessage,
  startNodeDialogue,
} from "../api/client";
import WarmupNoteModal from "./WarmupNoteModal";

export default function NodeDialogueView({
  sessionId,
  nodeId,
  nodeTitle,
  sceneText,
  choices,
  onChoose,
  onDialogueError,
  onNotesUpdate,
}) {
  const [messages, setMessages] = useState([]);
  const [showChoices, setShowChoices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requestingNote, setRequestingNote] = useState(false);
  const [draft, setDraft] = useState("");
  const [warmupNotes, setWarmupNotes] = useState([]);
  const [newWarmupIds, setNewWarmupIds] = useState([]);
  const [userTurnsCount, setUserTurnsCount] = useState(0);
  const [noteRequestMinTurns, setNoteRequestMinTurns] = useState(2);
  const [hasMoreWarmupNotes, setHasMoreWarmupNotes] = useState(false);
  const [openNote, setOpenNote] = useState(null);
  const listRef = useRef(null);

  const closeWarmupModal = useCallback(() => setOpenNote(null), []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, showChoices]);

  // Загрузка диалога при смене узла
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setShowChoices(false);
      setDraft("");
      setOpenNote(null);
      try {
        const data = await startNodeDialogue(sessionId);
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setShowChoices(Boolean(data.show_choices));
        setWarmupNotes(data.warmup_notes ?? []);
        setNewWarmupIds(data.newly_unlocked_note_ids ?? []);
        setUserTurnsCount(data.user_turns_count ?? 0);
        setNoteRequestMinTurns(data.note_request_min_user_turns ?? 2);
        setHasMoreWarmupNotes(Boolean(data.has_more_warmup_notes));
        onNotesUpdate?.(data.warmup_notes ?? [], data.newly_unlocked_note_ids ?? []);
      } catch (e) {
        if (!cancelled) {
          setMessages([]);
          onDialogueError?.("Не удалось открыть диалог с ведущим.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => { cancelled = true; };
  }, [sessionId, nodeId, onDialogueError]);

  // Отправка ручного сообщения
  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || showChoices) return;

    setSending(true);
    onDialogueError?.("");
    try {
      const data = await sendNodeDialogueMessage(sessionId, text);
      setMessages(data.messages ?? []);
      setShowChoices(Boolean(data.show_choices));
      setWarmupNotes(data.warmup_notes ?? []);
      setNewWarmupIds(data.newly_unlocked_note_ids ?? []);
      setUserTurnsCount(data.user_turns_count ?? 0);
      setNoteRequestMinTurns(data.note_request_min_user_turns ?? 2);
      setHasMoreWarmupNotes(Boolean(data.has_more_warmup_notes));
      onNotesUpdate?.(data.warmup_notes ?? [], data.newly_unlocked_note_ids ?? []);
      setDraft("");
    } catch (err) {
      onDialogueError?.("Сообщение не отправилось. Проверьте бекенд.");
    } finally {
      setSending(false);
    }
  }

  async function handleRequestNote() {
    if (loading || sending || requestingNote) return;

    setRequestingNote(true);
    onDialogueError?.("");
    try {
      const data = await requestNodeWarmupNote(sessionId);
      setMessages(data.messages ?? []);
      setShowChoices(Boolean(data.show_choices));
      setWarmupNotes(data.warmup_notes ?? []);
      setNewWarmupIds(data.newly_unlocked_note_ids ?? []);
      setUserTurnsCount(data.user_turns_count ?? 0);
      setNoteRequestMinTurns(data.note_request_min_user_turns ?? 2);
      setHasMoreWarmupNotes(Boolean(data.has_more_warmup_notes));
      onNotesUpdate?.(data.warmup_notes ?? [], data.newly_unlocked_note_ids ?? []);
    } catch (err) {
      onDialogueError?.("Не удалось получить заметку.");
    } finally {
      setRequestingNote(false);
    }
  }

  return (
    <div className="flex flex-col h-full font-sans">

      {/* ШАПКА ЧАТА */}
      <div className="px-5 py-4 border-b border-neutral-700 bg-neutral-900/50">
        <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          {nodeTitle || "Оперативная сводка"}
        </h2>
        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{sceneText}</p>
      </div>

      {/* ПАНЕЛЬ ЗАМЕТОК */}
      <div className="px-5 py-3 bg-neutral-800/50 border-b border-neutral-700 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={handleRequestNote}
          disabled={loading || sending || requestingNote || !hasMoreWarmupNotes}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border bg-amber-600/20 text-amber-300 border-amber-500/50 hover:bg-amber-600/30 disabled:opacity-50"
        >
          {requestingNote ? "Запрос..." : "Получить заметку"}
        </button>
        <span className="text-xs text-neutral-400">
          Для подсказки нужно минимум {noteRequestMinTurns} вопроса(ов). Сейчас: {userTurnsCount}.
        </span>
        {warmupNotes.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto custom-scrollbar">
            {warmupNotes.map((note, idx) => {
              const isNew = newWarmupIds.includes(note.id);
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setOpenNote(note)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isNew
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50"
                      : "bg-neutral-800 text-neutral-300 border-neutral-600 hover:text-white"
                  }`}
                >
                  Заметка {idx + 1}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ЗОНА СООБЩЕНИЙ */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar" ref={listRef}>
        {loading ? (
          <div className="text-center text-neutral-500 mt-10">Хронос-ИИ загружает данные...</div>
        ) : (
          messages.map((m, i) => (
            <div key={`${i}-${m.role}`} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              {/* ИИ ВЕДУЩИЙ */}
              {m.role === "assistant" && (
                <div className="w-full max-w-[95%]">
                  <div className="flex items-center gap-2 mb-1 pl-1">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Хронос-ИИ</span>
                  </div>
                  <div className="bg-neutral-900/70 border-l-4 border-amber-600 p-4 rounded-r-lg shadow">
                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              )}

              {/* ПОЛЬЗОВАТЕЛЬ */}
              {m.role === "user" && (
                <div className="max-w-[85%]">
                  <div className="flex items-center justify-end gap-2 mb-1 pr-1">
                    <span className="text-[10px] text-amber-600/70 font-bold uppercase">Вы</span>
                  </div>
                  <div className="bg-amber-600/20 border border-amber-500/30 text-amber-100 p-3 rounded-xl rounded-tr-none shadow">
                    <p className="text-sm">{m.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {sending && (
          <div className="text-xs text-neutral-500">Отправка данных...</div>
        )}

        {/* КНОПКИ ВЫБОРА (Появляются внизу чата, если ИИ ждет ответа) */}
        {showChoices && choices.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-neutral-700/50 pt-4">
            <p className="text-xs text-amber-500 uppercase tracking-widest mb-2">Примите решение:</p>
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoose(choice.id)}
                className="block w-full text-left bg-neutral-800 hover:bg-amber-600/20 border border-neutral-600 hover:border-amber-500 text-neutral-300 hover:text-amber-100 p-3 rounded-lg transition-all text-sm shadow-sm"
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ВВОД ТЕКСТА (Если выбор кнопок недоступен) */}
      <form onSubmit={handleSend} className="p-4 bg-neutral-900 border-t border-neutral-700 flex gap-2">
        <input
          type="text"
          placeholder={showChoices ? "Выберите решение кнопкой выше..." : "Ваш вопрос ведущему..."}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading || sending || showChoices}
          className="flex-1 bg-neutral-800 text-white placeholder-neutral-500 rounded-lg py-3 pl-4 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-600 border border-neutral-700 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || sending || showChoices || !draft.trim()}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>

      <WarmupNoteModal note={openNote} onClose={closeWarmupModal} />
    </div>
  );
}