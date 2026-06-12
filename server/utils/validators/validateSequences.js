export default function validateSequences(sequences, nodes = [], sourceMap = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = [];

  if (!Array.isArray(sequences)) {
    errors.push('sequences must be an array');
    return { isValid: false, isRepairable: false, errors, warnings, repairLog, repaired: [] };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const repaired = [];
  const seenIds = new Set();

  for (const sequence of sequences) {
    if (!sequence || typeof sequence !== 'object') {
      warnings.push('Skipped invalid sequence (not an object)');
      continue;
    }

    if (!sequence.id || typeof sequence.id !== 'string') {
      warnings.push('Skipped sequence without valid id');
      continue;
    }

    if (seenIds.has(sequence.id)) {
      warnings.push(`Skipped duplicate sequence id: ${sequence.id}`);
      continue;
    }

    if (!sequence.type || typeof sequence.type !== 'string') {
      warnings.push(`Sequence ${sequence.id}: missing or invalid type`);
      continue;
    }

    if (!sequence.label || typeof sequence.label !== 'string') {
      warnings.push(`Sequence ${sequence.id}: missing or invalid label`);
      continue;
    }

    if (!Array.isArray(sequence.nodeIds) || sequence.nodeIds.length === 0) {
      warnings.push(`Sequence ${sequence.id}: nodeIds must be a non-empty array`);
      continue;
    }

    const validNodeIds = sequence.nodeIds.filter((nid) => {
      if (!nodeIds.has(nid)) {
        warnings.push(`Sequence ${sequence.id}: references non-existent node ${nid}`);
        return false;
      }
      return true;
    });

    if (validNodeIds.length > 0 && validNodeIds.length !== sequence.nodeIds.length) {
      repairLog.push(`Removed invalid node references from sequence ${sequence.id}`);
    }

    if (validNodeIds.length === 0) {
      warnings.push(`Sequence ${sequence.id}: no valid node references`);
      continue;
    }

    repaired.push({
      id: sequence.id,
      type: sequence.type,
      label: sequence.label,
      nodeIds: validNodeIds,
    });
    seenIds.add(sequence.id);
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
