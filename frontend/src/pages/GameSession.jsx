import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  startScenario,
  chooseAction,
  loadVisitedNode,
  goBack,
} from "../api/client";
import StoryView from "../components/StoryView";
import SceneViewer from "../components/SceneViewer";
import TreeMap from "../components/TreeMap";
import WarmupNoteModal from "../components/WarmupNoteModal"; // Импортируем модальное окно

export default function GameSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;

  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [currentNode, setCurrentNode] = useState(null);
  const [treeNodes, setTreeNodes] = useState([]);
  const [visitedNodeIds, setVisitedNodeIds] = useState([]);
  const [pathNodeIds, setPathNodeIds] = useState([]);
  const [sceneNotes, setSceneNotes] = useState([]);
  const [sceneNewNoteIds, setSceneNewNoteIds] = useState([]);
  const [openNote, setOpenNote] = useState(null); // Новое состояние для открытой заметки

  const nodeTitleMap = useMemo(() => {
    const map = {};
    for (const node of treeNodes) {
      map[node.id] = node.title;
    }
    return map;
  }, [treeNodes]);

  const pathNodes = useMemo(() => {
    return pathNodeIds.map((id) => ({
      id,
      title: nodeTitleMap[id] || id,
    }));
  }, [pathNodeIds, nodeTitleMap]);

  useEffect(() => {
    if (!scenarioId) { navigate("/"); return; }
    async function init() {
      try {
        const data = await startScenario(scenarioId);
        setSessionId(data.session_id);
        setScenarioTitle(data.scenario_title);
        setCurrentNode(data.current_node);
        setTreeNodes(data.tree_nodes);
        setVisitedNodeIds(data.visited_node_ids);
        setPathNodeIds(data.path_node_ids);
      } catch (e) { setError("Ошибка загрузки."); }
    }
    init();
  }, [scenarioId, navigate]);

  const handleChoose = async (choiceId) => {
    try {
      const data = await chooseAction(sessionId, choiceId);
      setCurrentNode(data.current_node);
      setTreeNodes(data.tree_nodes);
      setVisitedNodeIds(data.visited_node_ids);
      setPathNodeIds(data.path_node_ids);
    } catch (e) { setError("Ошибка выбора."); }
  };

  const handleJumpToNode = async (nodeId) => {
    try {
      const data = await loadVisitedNode(sessionId, nodeId);
      setCurrentNode(data.current_node);
      setTreeNodes(data.tree_nodes);
      setVisitedNodeIds(data.visited_node_ids);
      setPathNodeIds(data.path_node_ids);
      // Скроллим вверх к чату при переходе по узлу (удобство)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError("Ошибка перехода."); }
  };

  const handleStepBack = async () => {
    try {
      const data = await goBack(sessionId);
      setCurrentNode(data.current_node);
      setTreeNodes(data.tree_nodes);
      setVisitedNodeIds(data.visited_node_ids);
      setPathNodeIds(data.path_node_ids);
    } catch (e) { setError("Ошибка возврата."); }
  };

  const closeWarmupModal = () => setOpenNote(null); // Функция для закрытия модального окна

  if (!currentNode) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono uppercase tracking-widest">Initialising Chronos-AI...</div>;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-stone-900 p-4 md:p-8 flex flex-col items-center gap-8 shadow-inner">

      <div className="w-full max-w-[1600px] flex flex-col lg:flex-row gap-6">

        <div className="flex-[1.5] h-[600px] rounded-3xl border border-neutral-800 overflow-hidden bg-neutral-900 shadow-2xl relative shadow-amber-500/5">
          <SceneViewer
            currentNode={currentNode}
            notes={sceneNotes}
            newNoteIds={sceneNewNoteIds}
            onNoteClick={setOpenNote} // Передаем функцию для открытия заметки
          />
        </div>

        <div className="flex-1 h-[600px] min-w-[380px] max-w-[480px]">
          <StoryView
            sessionId={sessionId}
            scenarioTitle={scenarioTitle}
            currentNode={currentNode}
            pathNodes={pathNodes}
            pathNodeIds={pathNodeIds}
            visitedNodeIds={visitedNodeIds}
            treeNodes={treeNodes}
            onChoose={handleChoose}
            onJumpToNode={handleJumpToNode}
            onBackToMenu={() => navigate("/")}
            onStepBack={handleStepBack}
            onDialogueError={setError}
            onNotesUpdate={(notes, newIds) => {
              setSceneNotes(notes);
              setSceneNewNoteIds(newIds);
            }}
          />
        </div>
      </div>

      <div className="w-full max-w-[1600px] min-h-[1000px] rounded-3xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-md shadow-2xl relative p-8 flex flex-col">

        <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-6">
          <div>
            <h3 className="text-amber-500 text-sm uppercase tracking-[0.5em] font-black italic">
              Temporal Axis Graph
            </h3>
            <p className="text-neutral-500 text-[10px] mt-1 font-mono uppercase">Карта временных линий и точек бифуркации</p>
          </div>
          <div className="px-4 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-[10px] font-bold">
            {treeNodes.length} NODES
          </div>
        </div>

        <div className="flex-1 w-full">
          <TreeMap
            treeNodes={treeNodes}
            visitedNodeIds={visitedNodeIds}
            pathNodeIds={pathNodeIds}
            currentNodeId={currentNode.id}
            onJumpToNode={handleJumpToNode}
          />
        </div>
      </div>

      <div className="py-12 flex flex-col items-center gap-2">
        <div className="h-px w-24 bg-neutral-800"></div>
        <p className="text-neutral-600 text-[9px] uppercase tracking-[0.4em] font-mono">
          Chronos Engine • Reality Simulation Protocol
        </p>
      </div>

      {/* Модальное окно для отображения заметок */}
      <WarmupNoteModal note={openNote} onClose={closeWarmupModal} />
    </div>
  );
}