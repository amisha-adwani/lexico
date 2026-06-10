
export const SCHEMA_VERSION = '1.0';

export const NODE_LIMITS = {
  SOFT: 50,    // Soft limit triggers collapsing in UI
  HARD: 200,   // Hard limit protects rendering
};

// Node types (flexible, can include more as needed)
export const NODE_TYPES = {
  CONCEPT: 'concept',
  STEP: 'step',
  EVENT: 'event',
  ITEM: 'item',
  DECISION: 'decision',
  ACTION: 'action',
  STAGE: 'stage',
  PHASE: 'phase',
  COMPONENT : 'component',
  ENTITY: 'entity',
  TOPIC: 'topic'
};

export const RELATION_TYPES = {
  DEPENDS_ON: 'depends_on',
  SUPPORTS: 'supports',
  PRECEDES: 'precedes',
  FOLLOWS: 'follows',
  RELATES_TO: 'relates_to',
  CONTAINS: 'contains',
  COMPARED_TO: 'compared_to',
};

export const SEQUENCE_TYPES = {
  PROCESS: 'process',
  TIMELINE: 'timeline',
  WORKFLOW: 'workflow',
};

/**
 * Normalize importance to [0.0, 1.0] range
 * @param {number} value - Raw importance value
 * @returns {number} - Clamped value in [0.0, 1.0]
 */
export function clampImportance(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0.5; // Default to middle value
  }
  return Math.max(0.0, Math.min(1.0, value));
}

/**
 * Compute normalized importance from multiple signals
 * Uses weighted combination of:
 * - AI importance suggestion (60%)
 * - Mention frequency (20%)
 * - Relation participation (10%)
 * - Sequence participation (10%)
 * @param {object} signals - { aiImportance, frequencyScore, relationScore, sequenceScore }
 * @returns {number} - Normalized importance [0.0, 1.0]
 */
export function computeNormalizedImportance(signals = {}) {
  const {
    aiImportance = 0.5,
    frequencyScore = 0.5,
    relationScore = 0.5,
    sequenceScore = 0.5,
  } = signals;

  const weighted =
    0.6 * clampImportance(aiImportance) +
    0.2 * clampImportance(frequencyScore) +
    0.1 * clampImportance(relationScore) +
    0.1 * clampImportance(sequenceScore);

  return clampImportance(weighted);
}

/**
 * @typedef {object} CanonicalIR
 * @property {DocumentMetadata} document
 * @property {Node[]} nodes
 * @property {Relation[]} relations
 * @property {Sequence[]} sequences
 * @property {Comparison[]} comparisons
 * @property {object} sourceMap
 */

/**
 * @typedef {object} DocumentMetadata
 * @property {string} schemaVersion - Must be '1.0'
 * @property {string} title - Document title
 * @property {string} summary - High-level summary
 * @property {string} language - ISO 639-1 language code (e.g., 'en')
 * @property {string} sourceFingerprint - SHA256 hash of source
 */

/**
 * @typedef {object} Node
 * @property {string} id - Unique node identifier (e.g., 'n1')
 * @property {string} label - Display label (required)
 * @property {string} type - Required node type from NODE_TYPES
 * @property {string} [summary] - Optional detailed description
 * @property {string} [time] - ISO 8601 timestamp for timed nodes
 * @property {string} [parentId] - Optional parent node ID
 * @property {string} [groupId] - Optional group ID for collapsing
 * @property {number} importance - Importance score [0.0, 1.0] (required)
 * @property {SourceRef[]} sourceRefs - Source citations (required)
 */

/**
 * @typedef {object} Relation
 * @property {string} id - Unique relation identifier (e.g., 'r1')
 * @property {string} sourceNodeId - Source node ID
 * @property {string} targetNodeId - Target node ID
 * @property {string} [relationType] - Optional relation type from RELATION_TYPES
 * @property {string} [label] - Optional relation label
 */

/**
 * @typedef {object} Sequence
 * @property {string} id - Unique sequence identifier (e.g., 's1')
 * @property {string} type - Sequence type from SEQUENCE_TYPES
 * @property {string} label - Sequence label
 * @property {string[]} nodeIds - Ordered array of node IDs
 */

/**
 * @typedef {object} Comparison
 * @property {string} id - Unique comparison identifier (e.g., 'c1')
 * @property {string} label - Comparison label
 * @property {ComparisonItem[]} items - Items being compared
 */

/**
 * @typedef {object} ComparisonItem
 * @property {string} itemId - Node ID being compared
 * @property {string} name - Display name
 * @property {Criterion[]} criteria - Comparison criteria
 */

/**
 * @typedef {object} Criterion
 * @property {string} criterion - Criterion name (e.g., 'cost', 'speed')
 * @property {string} value - Criterion value (e.g., 'low', 'high')
 */

/**
 * @typedef {object} SourceRef
 * @property {string} sourceId - Reference to sourceMap entry
 */

/**
 * @typedef {object} SourceMapEntry
 * @property {string} sourceId - Unique source identifier (e.g., 'chunk-1')
 * @property {string} type - Source type ('pdf-page', 'text', etc.)
 * @property {number} [page] - Page number if applicable
 * @property {string} excerpt - Brief excerpt from source (max 200 chars)
 */


export const MINIMAL_CANONICAL_IR = {
  document: {
    schemaVersion: SCHEMA_VERSION,
    title: 'Untitled',
    summary: 'Document processed with fallback schema.',
    language: 'en',
    sourceFingerprint: '',
    createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [],
  relations: [],
  sequences: [],
  comparisons: [],
  sourceMap: {},
};


export function createNode(
  id,
  label,
  sourceRefs,
  {
    type = null,
    summary = null,
    time = null,
    parentId = null,
    groupId = null,
    importance = 0.5,
  } = {}
) {
  const node = {
    id,
    label,
    importance: clampImportance(importance),
    sourceRefs: Array.isArray(sourceRefs) ? sourceRefs : [sourceRefs],
  };

  if (type) node.type = type;
  if (summary) node.summary = summary;
  if (time) node.time = time;
  if (parentId) node.parentId = parentId;
  if (groupId) node.groupId = groupId;

  return node;
}

export function createRelation(id, sourceNodeId, targetNodeId, { relationType = null, label = null } = {}) {
  const relation = {
    id,
    sourceNodeId,
    targetNodeId,
  };

  if (relationType) relation.relationType = relationType;
  if (label) relation.label = label;

  return relation;
}


export function createSequence(id, type, label, nodeIds) {
  return {
    id,
    type,
    label,
    nodeIds: Array.isArray(nodeIds) ? nodeIds : [nodeIds]
  };
}


export function createComparison(id, label, items) {
  return {
    id,
    label,
    items: Array.isArray(items) ? items : [items],
  };
}
