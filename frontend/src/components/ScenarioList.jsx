export default function ScenarioList({ scenarios, onSelectScenario }) {
  return (
    <div className="scenario-list">
      <h1 className="page-title">Исторический симулятор</h1>
      <p className="page-subtitle">
        Выбери историческую развилку и попробуй изменить ход событий.
      </p>

      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-card ${scenario.disabled ? "scenario-card--disabled" : ""}`}
            onClick={() => !scenario.disabled && onSelectScenario(scenario.id)}
            disabled={scenario.disabled}
          >
            <div className="scenario-card__title">{scenario.title}</div>
            <div className="scenario-card__period">{scenario.period}</div>
            <div className="scenario-card__description">{scenario.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}