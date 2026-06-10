export default function validateRelations(relations, nodes = [], sourceMap = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = [];

  if (!Array.isArray(relations)) {
    errors.push('relations must be an array');
    return { isValid: false, isRepairable: false, errors, warnings, repairLog, repaired: [] };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const repaired = [];
  const seenIds = new Set();

  for (const relation of relations) {
    if (!relation || typeof relation !== 'object') {
      warnings.push('Skipped invalid relation (not an object)');
      continue;
    }

    if (!relation.id || typeof relation.id !== 'string') {
      warnings.push('Skipped relation without valid id');
      continue;
    }

    if (seenIds.has(relation.id)) {
      warnings.push(`Skipped duplicate relation id: ${relation.id}`);
      continue;
    }

    const sourceNodeId = relation.sourceNodeId || relation.from;
    const targetNodeId = relation.targetNodeId || relation.to;
    const relationType = relation.relationType || relation.type;

    if (!sourceNodeId || !nodeIds.has(sourceNodeId)) {
      warnings.push(`Relation ${relation.id}: invalid sourceNodeId ${sourceNodeId}`);
      continue;
    }

    if (!targetNodeId || !nodeIds.has(targetNodeId)) {
      warnings.push(`Relation ${relation.id}: invalid targetNodeId ${targetNodeId}`);
      continue;
    }

    const validRelation = {
      id: relation.id,
      sourceNodeId,
      targetNodeId,
    };

    if (relationType && typeof relationType === 'string') {
      validRelation.relationType = relationType;
    }

    if (relation.label && typeof relation.label === 'string') {
      validRelation.label = relation.label;
    }

    repaired.push(validRelation);
    seenIds.add(relation.id);
  }

  return {
    isValid: errors.length === 0,
    isRepairable: repairLog.length > 0,
    errors,
    warnings,
    repairLog,
    repaired,
  };
}
