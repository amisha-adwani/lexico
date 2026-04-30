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
    const rootLabel = data?.title || 'Main Idea';
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
    const parentRadius = 280;
    const childRadius = 160;

    const validParents = nodesInput.filter(
      (entry) => entry && typeof entry.label === 'string' && Array.isArray(entry.children)
    );

    validParents.forEach((entry, parentIndex) => {
      const parentId = `mindmap-parent-${parentIndex}`;
      const parentPos = getRadialPosition(parentIndex, validParents.length, parentRadius);

      flowNodes.push({
        id: parentId,
        data: { label: entry.label.trim() || `Category ${parentIndex + 1}` },
        position: parentPos,
        style: {
          borderRadius: 14,
          border: '1px solid #7dd3fe',
          background: '#ffffff',
          padding: 8,
          color: '#1e293b',
        },
      });

      flowEdges.push({
        id: `edge-${rootId}-${parentId}`,
        source: rootId,
        target: parentId,
        animated: true,
        style: { stroke: '#60a5fa' },
      });

      const childLabels = entry.children
        .filter((child) => typeof child === 'string' && child.trim())
        .map((child) => child.trim());

      const parentAngle = (Math.PI * 2 * parentIndex) / validParents.length;
      const spreadRange = Math.PI * 0.6; // 108° arc
      const startAngle = parentAngle - spreadRange / 2;

      childLabels.forEach((childLabel, childIndex) => {
        const childAngle = childLabels.length === 1
          ? parentAngle
          : startAngle + (spreadRange / (childLabels.length - 1)) * childIndex;
        const childPos = {
          x: parentPos.x + Math.cos(childAngle) * childRadius,
          y: parentPos.y + Math.sin(childAngle) * childRadius,
        };
        const childId = `mindmap-child-${parentIndex}-${childIndex}`;

        flowNodes.push({
          id: childId,
          data: { label: childLabel },
          position: childPos,
          style: {
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#fbfbff',
            padding: 6,
            color: '#334155',
          },
        });

        flowEdges.push({
          id: `edge-${parentId}-${childId}`,
          source: parentId,
          target: childId,
          animated: true,
          style: { stroke: '#93c5fd' },
        });
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
