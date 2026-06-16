import { sortByImportance, buildHierarchyTree } from './utils.js';

export default function toConceptTreeViewModel(canonicalIR) {
  const { document, nodes = [], relations = [], sourceMap = {} } = canonicalIR;

  if (!nodes.length) {
    return {
      title: document.title || 'Concept Tree',
      root: null,
    };
  }

  const rootNode = sortByImportance(nodes)[0];
  const root = buildHierarchyTree(rootNode, nodes, relations, sourceMap, 0, 5);

  return {
    title: document.title || 'Concept Tree',
    summary: document.summary || '',
    root,
  };
}
