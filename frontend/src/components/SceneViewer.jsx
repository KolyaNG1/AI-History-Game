import React, { useState, useEffect } from 'react';

const SceneViewer = ({ currentNode, notes = [], newNoteIds = [], onNoteClick }) => {
  const [placedNotes, setPlacedNotes] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState('/images/desk_background.jpg'); // Фон по умолчанию

  useEffect(() => {
    setPlacedNotes([]);
  }, [currentNode?.id]);

  // ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ФОНОВОГО ИЗОБРАЖЕНИЯ В ЗАВИСИМОСТИ ОТ УЗЛА
  useEffect(() => {
    if (currentNode && currentNode.id) {
      // Предполагаем, что имя файла изображения совпадает с currentNode.id (в snake_case)
      const imageId = currentNode.id.toLowerCase().replace(/ /g, '_');
      const potentialImagePath = `/images/${imageId}.png`; // Или .jpg, если у вас такой формат

      // Можно добавить логику проверки, существует ли файл, но проще
      // просто установить путь и использовать onError на <img>
      setBackgroundImage(potentialImagePath);
    } else {
      setBackgroundImage('/images/desk_background.jpg'); // Возвращаем фон по умолчанию, если нет узла
    }
  }, [currentNode]);


  useEffect(() => {
    setPlacedNotes((prev) => {
      const newPlaced = [...prev];
      notes.forEach((note) => {
        if (!newPlaced.find((p) => p.id === note.id)) {
          newPlaced.push({
            ...note,
            top: `${Math.floor(20 + Math.random() * 60)}%`, // Немного сузил диапазон для центра
            left: `${Math.floor(20 + Math.random() * 60)}%`,
          });
        }
      });
      return newPlaced;
    });
  }, [notes]);

  // Функция для выбора иконки в зависимости от типа заметки
  const getNoteIcon = (type) => {
    // Если у тебя есть картинки: note.png, photo.png, folder.png
    // Ты можешь вернуть путь к ним. Пока — заглушка.
    switch(type?.toLowerCase()) {
      case 'document': return '/images/icons/folder.png';
      case 'photo': return '/images/icons/photo.png';
      default: return '/images/icons/default_note.png';
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      <img
        src={backgroundImage} // Используем динамический фон
        alt="Scene background"
        className="w-full h-full object-cover opacity-60"
        onError={(e) => {
          e.target.onerror = null; // Предотвратить зацикливание при ошибке
          e.target.src = '/images/desk_background.jpg'; // Запасной фон, если текущий не найден
        }}
      />

      {placedNotes.map((note) => {
        const isNew = newNoteIds.includes(note.id);

        return (
          <button
            key={note.id}
            className="absolute group z-20 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-95"
            style={{ top: note.top, left: note.left }}
            onClick={() => onNoteClick(note)}
          >
            <div className="relative">
              {/* ЭФФЕКТ СВЕЧЕНИЯ ДЛЯ НОВЫХ КАРТИНОК (типа текущая подсвечена)*/}
              {isNew && (
                <div className="absolute inset-0 bg-amber-500 rounded-lg blur-md animate-pulse opacity-50"></div>
              )}

              {/* САМА МИНИ-КАРТИНКА (ЗАМЕТКА) */}
            <img
              // Укажи здесь точное название своего файла из папки public/images/
              src="/images/avatar_started_1-removebg-preview.png"
              alt="note"
              className={`w-14 h-14 object-contain relative z-10 drop-shadow-2xl transition-all duration-500 ${
                isNew
                  ? 'scale-110 brightness-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
              }`}
              onError={(e) => {
                // Запасной вариант, если ты ошибся в названии файла
                e.target.src = 'https://cdn-icons-png.flaticon.com/512/2991/2991108.png';
              }}
            />

              {/* ТЕКСТ ПОД КАРТИНКОЙ (появляется при наведении) */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/90 text-[10px] text-amber-200 rounded border border-amber-900/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                {note.description || 'Изучить'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SceneViewer;