const PROCEDURAL_SEQUENCE_TYPES = new Set(['process', 'workflow']);
const CHRONOLOGICAL_SEQUENCE_TYPES = new Set(['timeline']);
const HIERARCHICAL_RELATION_TYPES = new Set([
  'contains',
  'supports',
  'part_of',
  'subtopic_of',
  'parent_of',
  'child_of',
  'includes',
  'belongs_to',
  'has_part',
  'composes',
  'is_a',
  'instance_of',
]);

function normalizeText(value) {
  if (typeof value !== 'string') {
    return value ?? '';
  }

  return value
    .replace(/```[a-z]*\s*/gi, ' ')
    .replace(/```+/g, ' ')
    .replace(/`+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeViewType(viewType) {
  return typeof viewType === 'string' ? viewType.toLowerCase() : '';
}

function getNodes(canonicalIR = {}) {
  return Array.isArray(canonicalIR.nodes) ? canonicalIR.nodes : [];
}

function getRelations(canonicalIR = {}) {
  return Array.isArray(canonicalIR.relations) ? canonicalIR.relations : [];
}

function getSequences(canonicalIR = {}) {
  return Array.isArray(canonicalIR.sequences) ? canonicalIR.sequences : [];
}

function getComparisons(canonicalIR = {}) {
  return Array.isArray(canonicalIR.comparisons) ? canonicalIR.comparisons : [];
}

function cleanDocument(document = {}) {
  return {
    ...document,
    title: normalizeText(document.title),
    summary: normalizeText(document.summary),
  };
}

function isValidTimestamp(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Keep timestamp checks strict (ISO-like) to avoid accidental parsing of ordinal labels (e.g., "Step 1").
  const looksIso =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed);
  return looksIso && !Number.isNaN(Date.parse(trimmed));
}

function countRelations(relations, types) {
  return relations.filter(relation => types.includes(relation.relationType)).length;
}

function getComparisonItemCount(canonicalIR = {}) {
  return getComparisons(canonicalIR).reduce((total, comparison) => {
    const items = Array.isArray(comparison.items) ? comparison.items : [];
    return total + items.filter(item => Array.isArray(item.criteria) && item.criteria.length > 0).length;
  }, 0);
}

function getHierarchyProfile(nodes = [], relations = []) {
  const adjacency = new Map();
  const childrenByParent = new Map();
  const nodesInHierarchy = new Set();
  const edgeCount = relations.reduce((total, relation) => {
    if (!HIERARCHICAL_RELATION_TYPES.has(relation.relationType) || !relation.sourceNodeId || !relation.targetNodeId) {
      return total;
    }

    nodesInHierarchy.add(relation.sourceNodeId);
    nodesInHierarchy.add(relation.targetNodeId);

    if (!childrenByParent.has(relation.sourceNodeId)) {
      childrenByParent.set(relation.sourceNodeId, []);
    }
    childrenByParent.get(relation.sourceNodeId).push(relation.targetNodeId);

    return total + 1;
  }, 0);

  nodes.forEach(node => {
    if (node.parentId) {
      nodesInHierarchy.add(node.id);
      nodesInHierarchy.add(node.parentId);

      if (!childrenByParent.has(node.parentId)) {
        childrenByParent.set(node.parentId, []);
      }
      childrenByParent.get(node.parentId).push(node.id);
    }
  });

  const childCounts = Array.from(childrenByParent.values()).map(children => children.length);
  const branchingFactor = childCounts.length > 0 ? Math.max(...childCounts) : 0;
  const connectedNodeCount = nodesInHierarchy.size;

  const depthByNode = new Map();
  const visit = (nodeId, depth, visited = new Set()) => {
    if (!nodeId || visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    const currentDepth = depthByNode.get(nodeId) || 0;
    if (depth > currentDepth) {
      depthByNode.set(nodeId, depth);
    }

    const children = childrenByParent.get(nodeId) || [];
    children.forEach(childId => visit(childId, depth + 1, visited));
  };

  nodes.forEach(node => visit(node.id, 1, new Set()));

  const maxHierarchyDepth = depthByNode.size > 0 ? Math.max(...depthByNode.values()) : 0;
  const branchingHierarchy = branchingFactor >= 2 || maxHierarchyDepth >= 2 || nodes.some(node => node.parentId);

  return {
    adjacency,
    edgeCount,
    branchingFactor,
    connectedNodeCount,
    maxHierarchyDepth,
    branchingHierarchy,
  };
}

export function analyzeCanonicalIR(canonicalIR = {}) {
  const document = cleanDocument(canonicalIR.document || {});
  const nodes = getNodes(canonicalIR);
  const relations = getRelations(canonicalIR);
  const sequences = getSequences(canonicalIR);
  const comparisons = getComparisons(canonicalIR);

  const timelineSequenceCount = sequences.filter(sequence => CHRONOLOGICAL_SEQUENCE_TYPES.has(sequence.type)).length;
  const processSequenceCount = sequences.filter(sequence => PROCEDURAL_SEQUENCE_TYPES.has(sequence.type)).length;
  const hierarchicalRelationCount = countRelations(relations, Array.from(HIERARCHICAL_RELATION_TYPES));
  const workflowRelationCount = countRelations(relations, ['depends_on', 'precedes', 'follows']);
  const comparisonRelationCount = countRelations(relations, ['compared_to']);
  const nodesWithTime = nodes.filter(node => isValidTimestamp(node.time)).length;
  const comparisonItemCount = getComparisonItemCount(canonicalIR);
  const hierarchyProfile = getHierarchyProfile(nodes, relations);
  const branchingHierarchy = hierarchyProfile.branchingHierarchy;
  const orderedSequenceLength = Math.max(
    0,
    ...sequences.map(sequence => (Array.isArray(sequence.nodeIds) ? sequence.nodeIds.length : 0))
  );

  const isProceduralDocument = processSequenceCount > 0 || workflowRelationCount > 0;
  const isChronologicalDocument = timelineSequenceCount > 0 || nodesWithTime >= 2;
  const isComparisonDocument = comparisonItemCount >= 2 || comparisonRelationCount > 0;
  const hasMeaningfulHierarchy =
    hierarchyProfile.edgeCount > 0 ||
    hierarchyProfile.branchingFactor >= 2 ||
    hierarchyProfile.maxHierarchyDepth >= 2 ||
    nodes.some(node => node.parentId) ||
    (nodes.length >= 2 && hierarchyProfile.connectedNodeCount >= 2);
  const isHierarchicalDocument = hasMeaningfulHierarchy || hierarchicalRelationCount > 0 || branchingHierarchy;
  const isConceptualDocument = nodes.length > 0 && !isProceduralDocument && !isChronologicalDocument && !isComparisonDocument;

  return {
    document,
    nodes,
    relations,
    sequences,
    comparisons,
    nodeCount: nodes.length,
    timelineSequenceCount,
    processSequenceCount,
    hierarchicalRelationCount,
    workflowRelationCount,
    comparisonRelationCount,
    nodesWithTime,
    comparisonItemCount,
    branchingHierarchy,
    hierarchyEdgeCount: hierarchyProfile.edgeCount,
    branchingFactor: hierarchyProfile.branchingFactor,
    connectedNodeCount: hierarchyProfile.connectedNodeCount,
    maxHierarchyDepth: hierarchyProfile.maxHierarchyDepth,
    orderedSequenceLength,
    isProceduralDocument,
    isChronologicalDocument,
    isComparisonDocument,
    isHierarchicalDocument,
    isConceptualDocument,
  };
}

export function isProceduralDocument(canonicalIR = {}) {
  return analyzeCanonicalIR(canonicalIR).isProceduralDocument;
}

export function isChronologicalDocument(canonicalIR = {}) {
  return analyzeCanonicalIR(canonicalIR).isChronologicalDocument;
}

export function isComparisonDocument(canonicalIR = {}) {
  return analyzeCanonicalIR(canonicalIR).isComparisonDocument;
}

export function isHierarchicalDocument(canonicalIR = {}) {
  return analyzeCanonicalIR(canonicalIR).isHierarchicalDocument;
}

export function isConceptualDocument(canonicalIR = {}) {
  return analyzeCanonicalIR(canonicalIR).isConceptualDocument;
}

export function isFlowDocument(canonicalIR = {}) {
  return isProceduralDocument(canonicalIR);
}

export function isTimelineDocument(canonicalIR = {}) {
  const profile = analyzeCanonicalIR(canonicalIR);
  return profile.isChronologicalDocument || profile.isProceduralDocument;
}

export function isMindMapDocument(canonicalIR = {}) {
  const profile = analyzeCanonicalIR(canonicalIR);
  return profile.isHierarchicalDocument && !profile.isProceduralDocument && !profile.isComparisonDocument;
}

export function isComparisonTableDocument(canonicalIR = {}) {
  return isComparisonDocument(canonicalIR) && !isProceduralDocument(canonicalIR);
}

export function scoreDocumentSuitability(canonicalIR = {}) {
  const profile = analyzeCanonicalIR(canonicalIR);

  const scores = {
    mindmap: 0,
    timeline: 0,
    flow: 0,
    comparison: 0,
    table: 0,
    conceptTree: 0,
    generic: 0,
  };

  if (profile.processSequenceCount > 0) {
    scores.flow += 0.6;
    scores.flow += Math.min(profile.processSequenceCount * 0.08, 0.25);
  }

  if (profile.workflowRelationCount > 0) {
    scores.flow += Math.min(profile.workflowRelationCount * 0.03, 0.15);
  }

  if (profile.orderedSequenceLength > 2) {
    scores.flow += Math.min(profile.orderedSequenceLength / 20, 0.15);
  }

  if (profile.timelineSequenceCount > 0) {
    scores.timeline += 0.6;
    scores.timeline += Math.min(profile.timelineSequenceCount * 0.08, 0.25);
  }

  // Procedural documents can also be meaningfully represented as an ordered timeline (Step 1, Phase 1, ...),
  // even when timestamps are not present.
  if (profile.processSequenceCount > 0) {
    scores.timeline += 0.35;
    scores.timeline += Math.min(profile.processSequenceCount * 0.05, 0.15);
  }

  if (profile.workflowRelationCount > 0) {
    scores.timeline += Math.min(profile.workflowRelationCount * 0.02, 0.1);
  }

  if (profile.orderedSequenceLength > 2) {
    scores.timeline += Math.min(profile.orderedSequenceLength / 20, 0.12);
  }

  if (profile.nodesWithTime > 0) {
    scores.timeline += Math.min(profile.nodesWithTime / Math.max(profile.nodeCount, 1), 0.2);
  }

  if (profile.comparisonItemCount > 0) {
    scores.comparison += 0.7;
    scores.comparison += Math.min(profile.comparisonItemCount / 20, 0.25);
  }

  if (profile.comparisonRelationCount > 0) {
    scores.comparison += Math.min(profile.comparisonRelationCount * 0.04, 0.15);
  }

  if (profile.isHierarchicalDocument) {
    scores.mindmap += 0.4;
    scores.conceptTree += 0.35;

    scores.mindmap += Math.min(profile.nodeCount / 10, 0.2);
    scores.conceptTree += Math.min(profile.nodeCount / 12, 0.15);

    scores.mindmap += Math.min(profile.maxHierarchyDepth / 4, 0.2);
    scores.conceptTree += Math.min(profile.maxHierarchyDepth / 5, 0.15);

    scores.mindmap += Math.min(profile.branchingFactor / 3, 0.2);
    scores.conceptTree += Math.min(profile.branchingFactor / 4, 0.15);

    const connectivityRatio = profile.nodeCount > 0
      ? profile.connectedNodeCount / profile.nodeCount
      : 0;

    scores.mindmap += Math.min(connectivityRatio * 0.25, 0.2);
    scores.conceptTree += Math.min(connectivityRatio * 0.2, 0.15);
  }

  if (profile.nodeCount > 0) {
    scores.table += 0.3;

    if (profile.nodeCount >= 20)
      scores.table += 0.15;

    if (profile.nodeCount >= 50)
      scores.table += 0.15;

    if (
      !profile.isProceduralDocument &&
      !profile.isChronologicalDocument
    ) {
      scores.table += 0.15;
    }
  }

  scores.generic =
    profile.nodeCount > 0
      ? 0.35
      : 1;

  const maxScore = Math.max(...Object.values(scores), 1);

  Object.keys(scores).forEach(key => {
    scores[key] = Number((scores[key] / maxScore).toFixed(2));
  });

  return { profile, scores };
}


export function evaluateVisualizationSuitability(canonicalIR = {}, viewType) {
  const { profile, scores } = scoreDocumentSuitability(canonicalIR);
  const type = normalizeViewType(viewType);

  if (type === 'generic') {
    return { success: true, qualityScore: scores.generic, error: null, profile };
  }

  if (type === 'flow') {
    if (!profile.isProceduralDocument) {
      return { success: false, qualityScore: 0, error: 'Document is not procedural enough for flow.', profile };
    }
    return { success: true, qualityScore: scores.flow, error: null, profile };
  }

  if (type === 'timeline') {
    if (!profile.isChronologicalDocument && !profile.isProceduralDocument) {
      return { success: false, qualityScore: 0, error: 'Document is not chronological enough for timeline.', profile };
    }
    return { success: true, qualityScore: scores.timeline, error: null, profile };
  }

  if (type === 'comparison') {
    if (profile.isProceduralDocument) {
      return { success: false, qualityScore: 0, error: 'Document is procedural and not suitable for comparison.', profile };
    }
    if (!profile.isComparisonDocument) {
      return { success: false, qualityScore: 0, error: 'Document does not contain comparable entities.', profile };
    }
    return { success: true, qualityScore: scores.comparison, error: null, profile };
  }

  if (type === 'mindmap') {
    if (!profile.isHierarchicalDocument || profile.isProceduralDocument || profile.isComparisonDocument) {
      return { success: false, qualityScore: 0, error: 'Document is not branching enough for mindmap.', profile };
    }
    return { success: true, qualityScore: scores.mindmap, error: null, profile };
  }

  if (type === 'conceptTree') {
    if (!profile.isHierarchicalDocument || profile.isProceduralDocument || profile.isComparisonDocument || profile.isChronologicalDocument) {
      return { success: false, qualityScore: 0, error: 'Document is not hierarchical enough for concept tree.', profile };
    }
    return { success: true, qualityScore: scores.conceptTree, error: null, profile };
  }

  if (type === 'table') {
    if (profile.nodeCount === 0) {
      return { success: false, qualityScore: 0, error: 'Document has no nodes to tabulate.', profile };
    }
    return { success: true, qualityScore: scores.table, error: null, profile };
  }

  return { success: profile.nodeCount > 0, qualityScore: scores.generic, error: null, profile };
}

export { normalizeText as cleanText, cleanDocument, normalizeViewType };