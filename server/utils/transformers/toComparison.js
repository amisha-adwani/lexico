import { sortByImportance, extractSourceCitations } from './utils.js';

export default function toComparisonViewModel(canonicalIR) {
  const { document, nodes = [], comparisons = [], sourceMap = {} } = canonicalIR;

  if (comparisons.length > 0) {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const items = comparisons[0].items.map(item => {
      const node = nodeMap[item.itemId];
      return {
        nodeId: item.itemId,
        label: node?.label || item.name || 'Item',
        points: (item.criteria || []).map(crit => ({
          criterion: crit.criterion,
          value: crit.value,
        })),
        sourceRefs: node?.sourceRefs || [],
        citations: node ? extractSourceCitations(node, sourceMap) : [],
      };
    });

    return {
      title: document.title || 'Comparison',
      summary: document.summary || '',
      items: items.slice(0, 10),
    };
  }

  const topNodes = sortByImportance(nodes).slice(0, 8);
  const items = topNodes.map(node => ({
    nodeId: node.id,
    label: node.label || 'Item',
    points: [
      { criterion: 'Type', value: node.type || 'concept' },
      { criterion: 'Importance', value: `${(node.importance || 0).toFixed(2)}` },
      { criterion: 'Description', value: (node.summary || '').substring(0, 50) },
    ],
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

  return {
    title: document.title || 'Comparison',
    summary: document.summary || '',
    items,
  };
}
