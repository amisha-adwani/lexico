/**
 * View Recommendation Engine
 *
 * Analyzes a Canonical IR and recommends the most appropriate visualization type.
 * Uses additive scoring across multiple signals to ensure robust recommendations.
 *
 * Supported view types:
 * - mindmap: Best for hierarchical, tree-like data with strong parent-child relationships
 * - timeline: Best for time-sequenced data and chronological ordering
 * - flow: Best for process workflows and ordered sequences
 * - comparison: Best for comparing attributes across items
 * - table: Best for structured tabular data with many records
 * - conceptTree: Best for hierarchical knowledge structures
 *
 * Scoring Strategy:
 * - Each view type is scored independently using additive scoring
 * - Scores accumulate from 0 to provide relative weights
 * - Final recommendation is the view with the highest score
 * - Confidence is normalized to [0, 1] range based on score distribution
 */

export default function recommendViewType(canonicalIR) {
  // Initialize scores for each view type
  const scores = {
    mindmap: 0,
    timeline: 0,
    flow: 0,
    comparison: 0,
    table: 0,
    conceptTree: 0,
  };

  const reasons = [];

  // Extract IR components with safe defaults
  const { document = {}, nodes = [], relations = [], sequences = [], comparisons = [] } = canonicalIR;

  // ====================================================================
  // HANDLE EDGE CASES
  // ====================================================================

  // If no nodes exist, return neutral recommendation
  if (!nodes || nodes.length === 0) {
    return {
      recommendedView: 'table',
      confidence: 0.0,
      scores,
      reasons: ['No nodes in document - defaulting to table view'],
    };
  }

  // ====================================================================
  // GATHER SIGNAL DATA
  // ====================================================================

  // Count relations by type for analysis
  const relationCounts = {
    total: relations.length,
    hierarchical: countRelationsByType(relations, ['contains', 'supports']),
    workflow: countRelationsByType(relations, ['depends_on', 'precedes', 'follows']),
    comparative: countRelationsByType(relations, ['compared_to']),
    total_unique_targets: new Set(relations.map(r => r.targetNodeId)).size,
  };

  // Analyze sequences by type
  const sequenceCounts = {
    timeline: sequences.filter(s => s.type === 'timeline').length,
    process: sequences.filter(s => s.type === 'process').length,
    workflow: sequences.filter(s => s.type === 'workflow').length,
  };

  // Count nodes with temporal data
  const nodesWithTime = nodes.filter(n => n.time && isValidTimestamp(n.time)).length;

  // Count nodes with parentId (explicit hierarchy markers)
  const nodesWithParent = nodes.filter(n => n.parentId).length;

  // Calculate relation density (relations per node)
  const relationDensity = relationCounts.total / nodes.length;

  // ====================================================================
  // MINDMAP SCORING
  // ====================================================================
  // Mindmap is ideal for hierarchical, tree-like structures with clear parent-child relationships
  // and moderate to high node counts

  // Score 1: Hierarchical relation signals
  // Many contains/supports relations indicate tree-like structure
  if (relationCounts.hierarchical > 0) {
    const hierarchicalRatio = relationCounts.hierarchical / relationCounts.total || 0;
    scores.mindmap += 10 * hierarchicalRatio;
    reasons.push(
      `Hierarchical relations detected (${relationCounts.hierarchical} contains/supports relations)`
    );
  }

  // Score 2: Explicit parent-child hierarchy via parentId
  // Direct parentId assignments are strong signals for hierarchy
  if (nodesWithParent > 0) {
    const parentRatio = nodesWithParent / nodes.length;
    scores.mindmap += 15 * parentRatio;
    reasons.push(
      `Parent-child hierarchy via parentId (${nodesWithParent}/${nodes.length} nodes have parents)`
    );
  }

  // Score 3: High node count
  // Mindmaps shine with moderate to high node counts (20-200 nodes)
  const nodeCountScore = getNodeCountScore(nodes.length);
  scores.mindmap += nodeCountScore.mindmap;
  if (nodeCountScore.mindmap > 0) {
    reasons.push(`Node count (${nodes.length}) suitable for mindmap visualization`);
  }

  // Score 4: Tree-like relation structure
  // A tree structure has approximately N-1 relations for N nodes
  // Calculate if relation structure matches tree pattern
  const relationsPerNode = relationCounts.total / nodes.length;
  if (relationsPerNode >= 0.5 && relationsPerNode <= 2) {
    scores.mindmap += 5 * (1 - Math.abs(relationsPerNode - 1)); // Peak at 1.0
    reasons.push(`Relation density (${relationsPerNode.toFixed(2)}) suggests tree structure`);
  }

  // ====================================================================
  // TIMELINE SCORING
  // ====================================================================
  // Timeline is ideal for time-sequenced, chronologically ordered data

  // Score 1: Timeline sequences
  // Explicit timeline sequences are the strongest signal
  if (sequenceCounts.timeline > 0) {
    scores.timeline += 25 * sequenceCounts.timeline;
    reasons.push(`Timeline sequences detected (${sequenceCounts.timeline} timeline sequences)`);
  }

  // Score 2: Nodes with timestamps
  // ISO 8601 timestamps indicate chronological data
  if (nodesWithTime > 0) {
    const timeRatio = nodesWithTime / nodes.length;
    scores.timeline += 20 * timeRatio;
    reasons.push(
      `Temporal data detected (${nodesWithTime}/${nodes.length} nodes have timestamps)`
    );
  }

  // Score 3: Process/workflow sequences as temporal fallback
  // Process sequences can be rendered as ordered timelines
  const processWorkflowSequences = sequenceCounts.process + sequenceCounts.workflow;
  if (processWorkflowSequences > 0) {
    scores.timeline += 8 * processWorkflowSequences;
    reasons.push(
      `Sequential data available (${processWorkflowSequences} process/workflow sequences)`
    );
  }

  // ====================================================================
  // FLOW SCORING
  // ====================================================================
  // Flow is ideal for process workflows and ordered sequences

  // Score 1: Process and workflow sequences
  // Explicit process/workflow sequences are the strongest signal for flow
  const totalSequences = processWorkflowSequences;
  if (totalSequences > 0) {
    scores.flow += 20 * totalSequences;
    reasons.push(
      `Process/workflow sequences detected (${processWorkflowSequences} sequences)`
    );
  }

  // Score 2: Workflow-style relations
  // depends_on, precedes, follows relations indicate process flow
  if (relationCounts.workflow > 0) {
    const workflowRatio = relationCounts.workflow / relationCounts.total || 0;
    scores.flow += 15 * workflowRatio;
    reasons.push(
      `Workflow relations detected (${relationCounts.workflow} depends_on/precedes/follows)`
    );
  }

  // Score 3: Sequence length consideration
  // Longer sequences are better suited for flow visualization
  const longestSequence = Math.max(
    ...sequences.map(s => s.nodeIds?.length || 0),
    0
  );
  if (longestSequence > 2) {
    const sequenceLengthBonus = Math.min(longestSequence / 10, 1); // Cap at 1.0
    scores.flow += 10 * sequenceLengthBonus;
    reasons.push(`Ordered sequences found (longest: ${longestSequence} nodes)`);
  }

  // ====================================================================
  // COMPARISON SCORING
  // ====================================================================
  // Comparison is ideal for comparing attributes across multiple items

  // Score 1: Existing canonical comparisons
  // Explicit comparisons in the IR are the strongest signal
  if (comparisons.length > 0) {
    const totalComparableItems = comparisons.reduce((sum, c) => sum + (c.items?.length || 0), 0);
    scores.comparison += 30 * comparisons.length;
    reasons.push(
      `Canonical comparisons exist (${comparisons.length} comparison(s) with ${totalComparableItems} items)`
    );
  }

  // Score 2: Comparison relations
  // compared_to relations indicate content is meant to be compared
  if (relationCounts.comparative > 0) {
    const comparativeRatio = relationCounts.comparative / relationCounts.total || 0;
    scores.comparison += 15 * comparativeRatio;
    reasons.push(
      `Comparison relations detected (${relationCounts.comparative} compared_to relations)`
    );
  }

  // ====================================================================
  // TABLE SCORING
  // ====================================================================
  // Table is ideal for structured, tabular data with many nodes and weak relations

  // Score 1: Many nodes with weak relational structure
  // Large node count with low relation density suggests table format
  if (nodes.length >= 10) {
    const tableNodeBonus = Math.min(nodes.length / 100, 5); // Up to 5 points
    scores.table += tableNodeBonus;
    reasons.push(`Large node count (${nodes.length} nodes) suitable for table format`);
  }

  // Score 2: Low relation density
  // Few relations relative to node count indicates disconnected records
  if (relationDensity < 0.5) {
    const lowDensityBonus = (0.5 - relationDensity) * 10; // Max 5 points
    scores.table += lowDensityBonus;
    reasons.push(`Low relation density (${relationDensity.toFixed(2)}) indicates tabular data`);
  } else if (relationDensity < 1) {
    // Moderate density also suitable for tables
    scores.table += 2;
    reasons.push(`Moderate relation density (${relationDensity.toFixed(2)}) compatible with table`);
  }

  // Score 3: No strong temporal or workflow signals
  // If there are no clear flow signals, table is a good fallback
  if (nodesWithTime === 0 && processWorkflowSequences === 0) {
    scores.table += 3;
    reasons.push('No temporal or workflow signals - table is suitable default');
  }

  // ====================================================================
  // CONCEPT TREE SCORING
  // ====================================================================
  // ConceptTree is ideal for hierarchical knowledge structures with strong contains/supports relations

  // Score 1: Hierarchical contains/supports relations
  // These indicate a knowledge tree structure
  if (relationCounts.hierarchical > 0) {
    const hierarchicalRatio = relationCounts.hierarchical / relationCounts.total || 0;
    scores.conceptTree += 12 * hierarchicalRatio;
    reasons.push(
      `Hierarchical structure via contains/supports (${relationCounts.hierarchical} relations)`
    );
  }

  // Score 2: Parent-child hierarchy
  // Explicit parentId relationships
  if (nodesWithParent > 0) {
    const parentRatio = nodesWithParent / nodes.length;
    scores.conceptTree += 10 * parentRatio;
    reasons.push(
      `Concept hierarchy (${nodesWithParent}/${nodes.length} nodes with parent)`
    );
  }

  // Score 3: Moderate node count
  // ConceptTree works well with 5-100 nodes
  const nodeCountConceptScore = getNodeCountScore(nodes.length).conceptTree;
  scores.conceptTree += nodeCountConceptScore;
  if (nodeCountConceptScore > 0) {
    reasons.push(`Node count (${nodes.length}) suitable for concept tree`);
  }

  // ====================================================================
  // CALCULATE FINAL RECOMMENDATION
  // ====================================================================

  // Find the view type with the highest score
  const sortedScores = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  const [recommendedView, maxScore] = sortedScores[0];
  const [, secondScore] = sortedScores[1];

  // Calculate confidence: normalized gap between top and second-place scores
  // If scores are close, confidence is lower
  // If there's a clear winner, confidence is higher
  let confidence = 0.0;
  if (maxScore > 0) {
    if (secondScore === 0) {
      confidence = Math.min(maxScore / 10, 1.0); // Normalize max possible score
    } else {
      // Use the ratio of gap to max score for confidence
      const gap = maxScore - secondScore;
      const ratio = gap / maxScore;
      confidence = Math.min(ratio, 1.0);
    }
  }

  const normalizedScores = normalizeScores(scores);
  const rankedViews = Object.entries(normalizedScores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([view, score]) => ({ view, score }));

  return {
    recommendedView,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
    rankedViews,
    scores: normalizedScores,
    reasons,
  };
}

/**
 * Count relations matching specified types
 * @param {Array} relations - Array of relation objects
 * @param {Array} types - Relation type names to count
 * @returns {number} Count of relations matching the specified types
 */
function countRelationsByType(relations, types) {
  if (!relations || !types) return 0;
  return relations.filter(r => types.includes(r.relationType)).length;
}

/**
 * Validate ISO 8601 timestamp format
 * @param {string} timestamp - Timestamp string
 * @returns {boolean} True if valid ISO 8601 timestamp
 */
function isValidTimestamp(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return false;
  // Simple ISO 8601 validation
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
  return iso8601Regex.test(timestamp);
}

/**
 * Determine view type suitability based on node count
 *
 * Different view types have optimal ranges:
 * - Mindmap: 10-200 nodes (deep hierarchies)
 * - Table: 10-1000 nodes (flat records)
 * - Timeline: 5-100 nodes (time-ordered)
 * - Flow: 5-50 nodes (process steps)
 * - ConceptTree: 5-100 nodes (knowledge hierarchy)
 * - Comparison: 2-20 items to compare
 *
 * @param {number} nodeCount - Total number of nodes
 * @returns {object} Score contributions for each view type
 */
function getNodeCountScore(nodeCount) {
  // Score based on suitability of node count for each view type
  const scores = {
    mindmap: 0,
    timeline: 0,
    flow: 0,
    comparison: 0,
    table: 0,
    conceptTree: 0,
  };

  if (nodeCount < 3) {
    // Very small documents - prefer simple views
    scores.comparison = 3;
    scores.table = 1;
    return scores;
  }

  if (nodeCount < 10) {
    // Small documents
    scores.flow = 5;
    scores.timeline = 3;
    scores.conceptTree = 3;
    scores.mindmap = 2;
    return scores;
  }

  if (nodeCount < 30) {
    // Small to medium documents - most views work
    scores.mindmap = 6;
    scores.timeline = 4;
    scores.flow = 4;
    scores.conceptTree = 4;
    scores.table = 3;
    return scores;
  }

  if (nodeCount < 100) {
    // Medium documents
    scores.mindmap = 7;
    scores.conceptTree = 5;
    scores.table = 5;
    scores.timeline = 3;
    scores.flow = 2;
    return scores;
  }

  if (nodeCount < 200) {
    // Large documents - mindmap and table excel
    scores.mindmap = 8;
    scores.table = 7;
    scores.conceptTree = 3;
    return scores;
  }

  // Very large documents - table is best
  scores.table = 10;
  scores.mindmap = 3;
  return scores;
}

/**
 * Normalize all scores to 0-1 range for consistency
 * Divides each score by the sum of all scores to get relative weights
 *
 * @param {object} scores - Object with score values
 * @returns {object} Normalized scores where each value is in [0, 1] and sum is 1.0
 */
function normalizeScores(scores) {
  const total = Object.values(scores).reduce((sum, s) => sum + s, 0);

  if (total === 0) {
    // If all scores are 0, distribute equally
    const count = Object.keys(scores).length;
    const normalized = {};
    Object.keys(scores).forEach(key => {
      normalized[key] = 1 / count;
    });
    return normalized;
  }

  const normalized = {};
  Object.entries(scores).forEach(([key, value]) => {
    normalized[key] = Math.round((value / total) * 100) / 100;
  });

  return normalized;
}
