import { sortByImportance, buildHierarchyTree } from './utils.js';

export default function toMindmapViewModel(canonicalIR) {
  const { document, nodes = [], relations = [], sourceMap = {} } = canonicalIR;

  if (!nodes.length) {
    return {
      title: document.title || 'Untitled',
      nodes: [],
    };
  }

  const rootNode = sortByImportance(nodes)[0];
  const hierarchyTree = buildHierarchyTree(rootNode, nodes, relations, sourceMap);

  const convertToMindmapFormat = (node, depth = 0) => {
    if (depth > 3) {
      return {
        label: node.label,
        nodeId: node.id,
        sourceRefs: node.sourceRefs || [],
        citations: node.citations || [],
        children: [],
      };
    }

    return {
      label: node.label,
      nodeId: node.id,
      type: node.type,
      importance: node.importance,
      sourceRefs: node.sourceRefs || [],
      citations: node.citations || [],
      children: (node.children || [])
        .map(child => convertToMindmapFormat(child, depth + 1))
        .slice(0, 8),
    };
  };

  return {
    title: document.title || 'Untitled',
    summary: document.summary || '',
    nodes: [convertToMindmapFormat(hierarchyTree)],
  };
}
