import NodeDialogueView from "./NodeDialogueView";
// import NodePath from "./NodePath"; // Если используешь
// import TreeMap from "./TreeMap"; // Если используешь

export default function StoryView({
  sessionId,
  scenarioTitle,
  currentNode,
  pathNodes,
  pathNodeIds,
  visitedNodeIds,
  treeNodes,
  onChoose,
  onJumpToNode,
  onBackToMenu,
  onStepBack,
  onDialogueError,
  onNotesUpdate, // ВАЖНО: Добавили этот проп
}) {
  const hasChoices = currentNode.choices && currentNode.choices.length > 0;

  return (
    <div className="flex flex-col h-full bg-neutral-800/80 backdrop-blur-md border border-neutral-700 shadow-2xl rounded-2xl overflow-hidden">
      {/* Шапка с кнопками */}
      <div className="flex justify-between p-2 bg-neutral-900 border-b border-neutral-700">
        <button onClick={onBackToMenu} className="text-xs text-neutral-400 hover:text-white px-2 py-1">
          ← В меню
        </button>
        <button
          onClick={onStepBack}
          disabled={pathNodeIds.length <= 1}
          className="text-xs text-neutral-400 hover:text-white disabled:opacity-30 px-2 py-1"
        >
          ← Отменить шаг
        </button>
      </div>

      {/* Основная зона */}
      <div className="flex-1 overflow-hidden">
        {hasChoices ? (
          <NodeDialogueView
            sessionId={sessionId}
            nodeId={currentNode.id}
            nodeTitle={currentNode.title}
            sceneText={currentNode.scene_text}
            choices={currentNode.choices}
            onChoose={onChoose}
            onDialogueError={onDialogueError}
            onNotesUpdate={onNotesUpdate} // ПРОКИДЫВАЕМ ДАЛЬШЕ
          />
        ) : (
          <div className="p-6 text-white text-center flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl text-amber-500 mb-4">Финал ветки</h2>
            <p className="mb-4">{currentNode.scene_text}</p>
            <div className="bg-neutral-900/70 p-4 rounded-lg text-sm text-neutral-300 border-l-4 border-amber-600">
              {currentNode.ai_response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}