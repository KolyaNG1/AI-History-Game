import { useEffect } from "react";

/**
 * Просмотр одной заметки прогрева. parts[] рассчитан на мультимодальный контент (текст, картинка, …).
 */
function WarmupNotePart({ part, index }) {
  const modality = part?.modality || "text";

  if (modality === "text") {
    return (
      <div className="warmup-part warmup-part--text" key={index}>
        <p className="warmup-part__text">{part.text ?? ""}</p>
      </div>
    );
  }

  if (modality === "image" && part.url) {
    return (
      <figure className="warmup-part warmup-part--image" key={index}>
        <img
          src={part.url}
          alt={part.alt || part.meta?.alt || "Иллюстрация к заметке"}
        />
        {part.text ? <figcaption>{part.text}</figcaption> : null}
      </figure>
    );
  }

  if (modality === "audio" && part.url) {
    return (
      <div className="warmup-part warmup-part--audio" key={index}>
        <audio controls src={part.url} preload="metadata">
          <track kind="captions" />
        </audio>
        {part.text ? <p className="warmup-part__caption">{part.text}</p> : null}
      </div>
    );
  }

  if (modality === "file" && part.url) {
    return (
      <div className="warmup-part warmup-part--file" key={index}>
        <a href={part.url} download className="warmup-part__link">
          {part.text || "Скачать файл"}
        </a>
      </div>
    );
  }

  return (
    <div className="warmup-part warmup-part--unknown" key={index}>
      <p className="warmup-part__fallback">
        Неподдерживаемый тип фрагмента: {modality}
        {part.url ? (
          <>
            {" "}
            <a href={part.url} target="_blank" rel="noreferrer">
              Открыть ссылку
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

export default function WarmupNoteModal({ note, onClose }) {
  useEffect(() => {
    if (!note) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note, onClose]);

  if (!note) return null;

  return (
    <div
      className="warmup-modal-backdrop"
      role="presentation"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="warmup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warmup-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="warmup-modal__head">
          <div>
            <div className="warmup-modal__eyebrow">
              Заметка · {note.note_type || "тип"}
            </div>
            <h2 id="warmup-modal-title" className="warmup-modal__title">
              {note.description || "Без названия"}
            </h2>
          </div>
          <button
            type="button"
            className="warmup-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="warmup-modal__body">
          {(note.parts || []).map((part, i) => (
            <WarmupNotePart key={i} part={part} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
