export default function NodePath({ pathNodes, currentNodeId, onJumpToNode }) {
  return (
    <div className="path-panel">
      <h3>Текущий путь</h3>
      <div className="path-list">
        {pathNodes.map((node, index) => {
          const isActive = node.id === currentNodeId;

          return (
            <button
              key={`${node.id}-${index}`}
              className={`path-item ${isActive ? "path-item--active" : ""}`}
              onClick={() => onJumpToNode(node.id)}
            >
              <div className="path-item__index">Шаг {index + 1}</div>
              <div className="path-item__title">{node.title}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}