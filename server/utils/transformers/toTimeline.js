import { extractSourceCitations } from './utils.js';

export default function toTimelineViewModel(canonicalIR) {
  const { document, nodes = [], sequences = [], sourceMap = {} } = canonicalIR;

  const timelineSequences = sequences.filter(s => s.type === 'timeline');

  if (timelineSequences.length > 0) {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const points = [];

    timelineSequences.forEach(seq => {
      seq.nodeIds.forEach((nodeId, index) => {
        const node = nodeMap[nodeId];
        if (node) {
          points.push({
            nodeId: node.id,
            label: node.label || `Step ${index + 1}`,
            timestamp: node.time || undefined,
            description: node.summary || '',
            importance: node.importance,
            order: index,
            sourceRefs: node.sourceRefs || [],
            citations: extractSourceCitations(node, sourceMap),
          });
        }
      });
    });

    return {
      title: document.title || 'Timeline',
      summary: document.summary || '',
      points: points.sort((a, b) => a.order - b.order),
    };
  }

  const timedNodes = nodes
    .filter(n => n.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const points = timedNodes.map((node, index) => ({
    nodeId: node.id,
    label: node.label || `Event ${index + 1}`,
    timestamp: node.time,
    description: node.summary || '',
    importance: node.importance,
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

  return {
    title: document.title || 'Timeline',
    summary: document.summary || '',
    points,
  };
}