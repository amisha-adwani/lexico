import { NODE_LIMITS } from './canonicalSchema.js';

function collapseNodesByImportance(nodes) {
  const sorted = [...nodes].sort((a, b) => {
    const aImportance = typeof a.importance === 'number' ? a.importance : 0.5;
    const bImportance = typeof b.importance === 'number' ? b.importance : 0.5;
    return bImportance - aImportance;
  });
  return sorted.slice(0, NODE_LIMITS.HARD);
}

function cleanRelations(relations, allowedNodeIds) {
  return relations.filter((relation) => {
    return (
      relation.sourceNodeId &&
      relation.targetNodeId &&
      allowedNodeIds.has(relation.sourceNodeId) &&
      allowedNodeIds.has(relation.targetNodeId)
    );
  });
}

function cleanSequences(sequences, allowedNodeIds) {
  return sequences
    .map((sequence) => {
      const nodeIds = Array.isArray(sequence.nodeIds)
        ? sequence.nodeIds.filter((id) => allowedNodeIds.has(id))
        : [];

      if (nodeIds.length === 0) {
        return null;
      }

      return { ...sequence, nodeIds };
    })
    .filter(Boolean);
}

function cleanComparisons(comparisons, allowedNodeIds) {
  return comparisons
    .map((comparison) => {
      if (!Array.isArray(comparison.items)) {
        return null;
      }

      const items = comparison.items.filter((item) => item && allowedNodeIds.has(item.itemId));
      if (items.length === 0) {
        return null;
      }

      return { ...comparison, items };
    })
    .filter(Boolean);
}

export default function enforceNodeLimits(ir) {
  const warnings = [];
  const repairLog = [];

  const nodes = Array.isArray(ir.nodes) ? [...ir.nodes] : [];
  const relations = Array.isArray(ir.relations) ? [...ir.relations] : [];
  const sequences = Array.isArray(ir.sequences) ? [...ir.sequences] : [];
  const comparisons = Array.isArray(ir.comparisons) ? [...ir.comparisons] : [];

  if (nodes.length > NODE_LIMITS.SOFT) {
    warnings.push(`Node count (${nodes.length}) exceeds soft limit (${NODE_LIMITS.SOFT})`);
  }

  let repairedNodes = nodes;
  if (nodes.length > NODE_LIMITS.HARD) {
    repairedNodes = collapseNodesByImportance(nodes);
    repairLog.push(`Collapsed nodes to hard limit using importance-based strategy`);
    warnings.push(`Node count exceeds hard limit (${NODE_LIMITS.HARD}); collapsed low-importance nodes`);
  }

  const allowedNodeIds = new Set(repairedNodes.map((node) => node.id));
  const repairedRelations = cleanRelations(relations, allowedNodeIds);
  const repairedSequences = cleanSequences(sequences, allowedNodeIds);
  const repairedComparisons = cleanComparisons(comparisons, allowedNodeIds);

  if (repairedRelations.length !== relations.length) {
    repairLog.push('Removed dangling relations after node collapse');
  }
  if (repairedSequences.length !== sequences.length) {
    repairLog.push('Removed or trimmed dangling sequences after node collapse');
  }
  if (repairedComparisons.length !== comparisons.length) {
    repairLog.push('Removed dangling comparisons after node collapse');
  }

  return {
    isValid: repairedNodes.length <= NODE_LIMITS.HARD,
    isRepairable: repairLog.length > 0,
    errors: [],
    warnings,
    repairLog,
    repaired: {
      nodes: repairedNodes,
      relations: repairedRelations,
      sequences: repairedSequences,
      comparisons: repairedComparisons,
    },
  };
}
