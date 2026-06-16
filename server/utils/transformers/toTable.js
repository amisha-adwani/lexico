import { sortByImportance, extractSourceCitations } from './utils.js';

export default function toTableViewModel(canonicalIR) {
  const { document, nodes = [], sourceMap = {} } = canonicalIR;

  const columns = [
    { id: 'label', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'importance', label: 'Importance' },
    { id: 'summary', label: 'Description' },
  ];

  const rows = sortByImportance(nodes).slice(0, 100).map(node => ({
    nodeId: node.id,
    label: node.label || 'Untitled',
    type: node.type || 'concept',
    importance: (node.importance || 0).toFixed(2),
    summary: (node.summary || '').substring(0, 100),
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

  return {
    title: document.title || 'Data Table',
    summary: document.summary || '',
    columns,
    rows,
  };
}
