import { sortByImportance, extractSourceCitations } from './utils.js';

export default function toFlowViewModel(canonicalIR) {
  const { document, nodes = [], sequences = [], sourceMap = {} } = canonicalIR;

  const flowSequences = sequences.filter(s => ['process', 'workflow'].includes(s.type));

  if (flowSequences.length > 0) {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const steps = [];

    flowSequences.forEach(seq => {
      seq.nodeIds.forEach((nodeId, index) => {
        const node = nodeMap[nodeId];
        if (node) {
          steps.push({
            id: node.id,
            label: node.label || `Step ${index + 1}`,
            description: node.summary || '',
            stepNumber: index + 1,
            type: node.type,
            importance: node.importance,
            sourceRefs: node.sourceRefs || [],
            citations: extractSourceCitations(node, sourceMap),
          });
        }
      });
    });

    return {
      title: document.title || 'Process Flow',
      summary: document.summary || '',
      steps: steps.slice(0, 20),
    };
  }

  const topNodes = sortByImportance(nodes).slice(0, 10);
  const steps = topNodes.map((node, index) => ({
    id: node.id,
    label: node.label || `Step ${index + 1}`,
    description: node.summary || '',
    stepNumber: index + 1,
    type: node.type,
    importance: node.importance,
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

  return {
    title: document.title || 'Process Flow',
    summary: document.summary || '',
    steps,
  };
}