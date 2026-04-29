import { useEffect, useMemo, useRef, useState } from "react";

function buildNodeMap(treeNodes) {
  return new Map(treeNodes.map((node) => [node.id, node]));
}

function buildIncoming(treeNodes) {
  const incoming = new Map(treeNodes.map((node) => [node.id, 0]));
  for (const node of treeNodes) {
    for (const childId of node.next_node_ids) {
      incoming.set(childId, (incoming.get(childId) || 0) + 1);
    }
  }
  return incoming;
}

function buildLevels(treeNodes) {
  const nodeMap = buildNodeMap(treeNodes);
  const incoming = buildIncoming(treeNodes);
  const roots = treeNodes.filter((node) => (incoming.get(node.id) || 0) === 0);

  const queue = roots.map((node) => ({ id: node.id, depth: 0 }));
  const bestDepth = new Map();
  const levels = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const knownDepth = bestDepth.get(current.id);

    if (knownDepth !== undefined && knownDepth <= current.depth) {
      continue;
    }

    bestDepth.set(current.id, current.depth);

    if (!levels[current.depth]) {
      levels[current.depth] = [];
    }

    const node = nodeMap.get(current.id);
    if (node && !levels[current.depth].some((item) => item.id === node.id)) {
      levels[current.depth].push(node);
    }

    if (!node) {
      continue;
    }

    for (const childId of node.next_node_ids) {
      queue.push({ id: childId, depth: current.depth + 1 });
    }
  }

  return levels.filter(Boolean);
}

function edgeKey(from, to) {
  return `${from}__${to}`;
}

export default function TreeMap({
  treeNodes,
  visitedNodeIds,
  pathNodeIds,
  currentNodeId,
  onJumpToNode,
}) {
  const nodeMap = useMemo(() => buildNodeMap(treeNodes), [treeNodes]);
  const levels = useMemo(() => buildLevels(treeNodes), [treeNodes]);
  const visitedSet = useMemo(() => new Set(visitedNodeIds), [visitedNodeIds]);
  const pathSet = useMemo(() => new Set(pathNodeIds), [pathNodeIds]);

  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const nodeRefs = useRef({});
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    function recalc() {
      const viewport = viewportRef.current;
      const canvas = canvasRef.current;
      if (!viewport || !canvas) {
        return;
      }

      const viewportRect = viewport.getBoundingClientRect();
      const nextEdges = [];

      for (const node of treeNodes) {
        const fromEl = nodeRefs.current[node.id];
        if (!fromEl) {
          continue;
        }

        const fromRect = fromEl.getBoundingClientRect();
        const x1 = fromRect.right - viewportRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - viewportRect.top;

        for (const childId of node.next_node_ids) {
          const toEl = nodeRefs.current[childId];
          if (!toEl) {
            continue;
          }

          const toRect = toEl.getBoundingClientRect();
          const x2 = toRect.left - viewportRect.left;
          const y2 = toRect.top + toRect.height / 2 - viewportRect.top;

          const midX = x1 + Math.max(28, (x2 - x1) * 0.45);

          nextEdges.push({
            key: edgeKey(node.id, childId),
            from: node.id,
            to: childId,
            d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
            isVisited: visitedSet.has(node.id) && visitedSet.has(childId),
            isPath: pathSet.has(node.id) && pathSet.has(childId),
          });
        }
      }

      canvas.setAttribute("width", String(Math.max(viewport.scrollWidth, viewport.clientWidth)));
      canvas.setAttribute("height", String(Math.max(viewport.scrollHeight, viewport.clientHeight)));
      setEdges(nextEdges);
    }

    recalc();

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => recalc());
    resizeObserver.observe(viewport);

    window.addEventListener("resize", recalc);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [treeNodes, visitedSet, pathSet]);

  return (
    <div className="tree-panel tree-panel--detroit">
      <div className="tree-panel__header">
        <div className="tree-panel__progress">
          <span className="tree-panel__progress-strong">
            {Math.round((visitedNodeIds.length / Math.max(treeNodes.length, 1)) * 100)}%
          </span>{" "}
          открыто
        </div>
        <div className="tree-panel__title">Дерево сценария</div>
      </div>

      <div className="tree-panel__legend">
        <span><i className="tree-dot tree-dot--current" /> текущий</span>
        <span><i className="tree-dot tree-dot--path" /> активный путь</span>
        <span><i className="tree-dot tree-dot--visited" /> посещён</span>
      </div>

      <div className="tree-viewport" ref={viewportRef}>
        <svg ref={canvasRef} className="tree-svg">
          {edges.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              className={[
                "tree-svg__edge",
                edge.isVisited ? "tree-svg__edge--visited" : "",
                edge.isPath ? "tree-svg__edge--path" : "",
              ].join(" ").trim()}
            />
          ))}
        </svg>

        <div className="tree-flow">
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="tree-column">
              <div className="tree-column__label">Шаг {levelIndex + 1}</div>

              <div className="tree-column__nodes">
                {level.map((node) => {
                  const isVisited = visitedSet.has(node.id);
                  const isCurrent = currentNodeId === node.id;
                  const isPath = pathSet.has(node.id);

                  return (
                    <div key={node.id} className="tree-node-wrapper">
                      <button
                        ref={(el) => {
                          nodeRefs.current[node.id] = el;
                        }}
                        className={[
                          "tree-node-card",
                          isVisited ? "tree-node-card--visited" : "",
                          isPath ? "tree-node-card--path" : "",
                          isCurrent ? "tree-node-card--current" : "",
                        ].join(" ").trim()}
                        onClick={() => isVisited && onJumpToNode(node.id)}
                        disabled={!isVisited}
                      >
                        <div className="tree-node-card__title">{node.title}</div>
                        <div className="tree-node-card__id">{node.id}</div>
                      </button>

                      <div className="tree-node-choices">
                        {node.next_node_ids.length > 0 ? (
                          node.next_node_ids.map((childId) => {
                            const child = nodeMap.get(childId);
                            const childVisited = visitedSet.has(childId);
                            const childPath = pathSet.has(childId);

                            return (
                              <div
                                key={childId}
                                className={[
                                  "tree-choice-chip",
                                  childVisited ? "tree-choice-chip--visited" : "",
                                  childPath ? "tree-choice-chip--path" : "",
                                ].join(" ").trim()}
                              >
                                {child ? child.title : childId}
                              </div>
                            );
                          })
                        ) : (
                          <div className="tree-ending-chip__text">Финал ветки</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}