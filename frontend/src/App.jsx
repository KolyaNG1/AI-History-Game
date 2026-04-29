import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GameSession from "./pages/GameSession";
import MusicPlayer from "./components/MusicPlayer";

export default function App() {
  return (
    <Router>
      <MusicPlayer />

      <Routes>
        {/* Главная страница (по умолчанию) */}
        <Route path="/" element={<HomePage />} />

        {/* Страница игрового процесса */}
        <Route path="/game" element={<GameSession />} />
      </Routes>
    </Router>
  );
}