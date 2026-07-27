import { sortByImportance, buildHierarchyTree } from './utils.js';
import { cleanDocument, isMindMapDocument } from '../visualizationSuitability.js';

export default function toMindmapViewModel(canonicalIR) {
  const { document = {}, nodes = [], relations = [], sourceMap = {} } = canonicalIR;
  const clean = cleanDocument(document);

  if (!nodes.length) {
    return {
      title: clean.title || 'Untitled',
      nodes: [],
    };
  }

  if (!isMindMapDocument(canonicalIR)) {
    return {
      title: clean.title || 'Untitled',
      summary: clean.summary || '',
      nodes: [],
    };
  }

  const rootNode = sortByImportance(nodes)[0];
  const hierarchyTree = buildHierarchyTree(rootNode, nodes, relations, sourceMap);

  const convertToMindmapFormat = (node, depth = 0) => {
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
    title: clean.title || 'Untitled',
    summary: clean.summary || '',
    nodes: [convertToMindmapFormat(hierarchyTree)],
  };
}
