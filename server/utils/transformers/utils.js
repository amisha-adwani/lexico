export function extractSourceCitations(node, sourceMap = {}) {
  if (!node.sourceRefs || !Array.isArray(node.sourceRefs)) {
    return [];
  }

  return node.sourceRefs
    .map(ref => sourceMap[ref.sourceId])
    .filter(Boolean)
    .map(entry => ({
      sourceId: entry.sourceId,
      type: entry.type,
      excerpt: entry.excerpt,
      page: entry.page,
    }));
}


export function sortByImportance(nodes) {
  return [...nodes].sort((a, b) => (b.importance || 0) - (a.importance || 0));
}


export function findChildNodeIds(parentId, relations = []) {
  const children = new Set();
  relations.forEach(rel => {
    if (rel.sourceNodeId === parentId && rel.relationType !== 'compared_to') {
      children.add(rel.targetNodeId);
    }
  });
  return children;
}


export function createViewNode(node, sourceMap = {}) {
  return {
    id: node.id,
    label: node.label || 'Untitled',
    type: node.type || 'concept',
    importance: node.importance || 0.5,
    summary: node.summary || undefined,
    time: node.time || undefined,
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  };
}

/**
 * Build a hierarchical tree structure from relations
 * @param {Node} rootNode - Root node
 * @param {Node[]} allNodes - All available nodes
 * @param {Relation[]} relations - Relations defining hierarchy
 * @param {object} sourceMap - Source mapping
 * @param {number} depth - Current depth (for limiting recursion)
 * @param {number} maxDepth - Maximum depth allowed
 * @returns {object} - Tree node with children
 */
export function buildHierarchyTree(rootNode, allNodes, relations, sourceMap, depth = 0, maxDepth = 4) {
  if (depth >= maxDepth) {
    return createViewNode(rootNode, sourceMap);
  }

  const childIds = findChildNodeIds(rootNode.id, relations);
  const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]));

  const children = Array.from(childIds)
    .map(childId => nodeMap[childId])
    .filter(Boolean)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10)
    .map(child => buildHierarchyTree(child, allNodes, relations, sourceMap, depth + 1, maxDepth));

  return {
    ...createViewNode(rootNode, sourceMap),
    children: children.length > 0 ? children : undefined,
  };
}
