import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

function getRadialPosition(index, total, radius) {
  const safeTotal = Math.max(total, 1);
  const angle = (Math.PI * 2 * index) / safeTotal;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function MindMapBlock({ data }) {
  const graph = useMemo(() => {
    const nodesInput = Array.isArray(data?.nodes) ? data.nodes : [];
    const rootLabel = nodesInput[0]?.label || data?.title || 'Main Idea';
    const children = [];

    nodesInput.forEach((entry) => {
      if (!Array.isArray(entry?.children)) return;
      entry.children.forEach((child) => {
        if (typeof child === 'string' && child.trim()) {
          children.push(child.trim());
        }
      });
    });

    const uniqueChildren = Array.from(new Set(children));
    const rootId = 'mindmap-root';

    const flowNodes = [
      {
        id: rootId,
        data: { label: rootLabel },
        position: { x: 0, y: 0 },
        style: {
          borderRadius: 16,
          border: '1px solid #7dd3fc',
          background: '#f0f9ff',
          padding: 10,
          color: '#0f172a',
          fontWeight: 600,
        },
      },
    ];

    const flowEdges = [];

    uniqueChildren.forEach((label, index) => {
      const id = `mindmap-child-${index}`;
      const position = getRadialPosition(index, uniqueChildren.length, 180);

      flowNodes.push({
        id,
        data: { label },
        position,
        style: {
          borderRadius: 14,
          border: '1px solid #bfdbfe',
          background: '#ffffff',
          padding: 8,
          color: '#1e293b',
        },
      });

      flowEdges.push({
        id: `edge-${rootId}-${id}`,
        source: rootId,
        target: id,
        animated: true,
        style: { stroke: '#60a5fa' },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  return (
    <article className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700">Mind Map</p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{data?.title || 'Concept Map'}</h3>

      <div className="h-[360px] overflow-hidden rounded-xl border border-sky-200 bg-white">
        <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView fitViewOptions={{ padding: 0.35 }}>
          <MiniMap zoomable pannable />
          <Controls showInteractive={false} />
          <Background color="#e2e8f0" gap={24} />
        </ReactFlow>
      </div>
    </article>
  );
}

export default MindMapBlock;
