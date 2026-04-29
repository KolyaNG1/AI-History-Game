import { useState, useRef, useEffect } from 'react';
import './MusicPlayer.css';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef(null);

  useEffect(() => {
  // Автозапуск с плавным появлением звука
  const playAudio = () => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        // Плавное увеличение громкости
        let vol = 0;
        const interval = setInterval(() => {
          if (vol < volume) {
            vol += 0.05;
            audioRef.current.volume = vol;
          } else {
            clearInterval(interval);
          }
        }, 100);
      }).catch(e => console.log('Автовоспроизведение заблокировано браузером'));
    }
  };

  // Ждём взаимодействия пользователя для автовоспроизведения
  const handleUserInteraction = () => {
    playAudio();
    document.removeEventListener('click', handleUserInteraction);
  };

  document.addEventListener('click', handleUserInteraction);

  return () => {
    document.removeEventListener('click', handleUserInteraction);
  };
}, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div className={`music-player ${isVisible ? 'visible' : ''}`}>
      <audio
        ref={audioRef}
        src="/audio/Geek Music - Hearthstone - Main Theme.mp3"
        loop
        preload="auto"
      />
      <button
        className="music-toggle"
        onClick={togglePlay}
        title={isPlaying ? 'Выключить музыку' : 'Включить музыку'}
      >
        {isPlaying ? '🔊' : '🔈'}
      </button>
      <div className="volume-control">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
    </div>
  );
};

export default MusicPlayer;