import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScenarios } from "../api/client";
import ScenarioList from "../components/ScenarioList";

export default function HomePage() {
  const [scenarios, setScenarios] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadScenarios() {
      try {
        const data = await fetchScenarios();
        setScenarios(data);
      } catch (e) {
        setError("Не удалось загрузить сценарии с backend.");
      }
    }

    loadScenarios();
  }, []);

  function handleSelectScenario(scenarioId) {
    // Вместо запуска игры здесь, мы переходим на роут /game
    // и передаем ID выбранного сценария через state роутера
    navigate("/game", { state: { scenarioId } });
  }

  return (
    <div className="page-shell">
      {error ? <div className="error-banner">{error}</div> : null}
      <ScenarioList
        scenarios={scenarios.map((scenario) => ({
          ...scenario,
          disabled: false,
        }))}
        onSelectScenario={handleSelectScenario}
      />
    </div>
  );
}