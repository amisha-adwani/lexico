import { clampImportance } from '../canonicalSchema.js';
import { validateSourceRefs } from './validateSourceRefs.js';

export default function validateNodes(nodes, sourceMap = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = [];

  if (!Array.isArray(nodes)) {
    errors.push('nodes must be an array');
    return { isValid: false, isRepairable: false, errors, warnings, repairLog, repaired: [] };
  }

  const repaired = [];
  const seenIds = new Set();

  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      warnings.push('Skipped invalid node (not an object)');
      continue;
    }

    if (!node.id || typeof node.id !== 'string') {
      warnings.push('Skipped node without valid id');
      continue;
    }

    if (seenIds.has(node.id)) {
      warnings.push(`Skipped duplicate node id: ${node.id}`);
      continue;
    }

    if (!node.type || typeof node.type !== 'string') {
      warnings.push(`Node ${node.id} has missing or invalid type`);
      continue;
    }

    if (!node.label || typeof node.label !== 'string') {
      warnings.push(`Node ${node.id} has missing or invalid label`);
      continue;
    }

    const importance = clampImportance(node.importance !== undefined ? node.importance : 0.5);
    if (node.importance === undefined || typeof node.importance !== 'number' || isNaN(node.importance)) {
      repairLog.push(`Normalized importance for node ${node.id}`);
    }

    const sourceRefs = validateSourceRefs(node.sourceRefs, sourceMap);
    if (sourceRefs.length === 0) {
      warnings.push(`Node ${node.id} has no valid sourceRefs`);
      continue;
    }

    const validNode = {
      id: node.id,
      type: node.type,
      label: node.label.trim(),
      importance,
      sourceRefs,
    };

    if (node.summary && typeof node.summary === 'string') {
      validNode.summary = node.summary.trim();
    }

    if (node.time && typeof node.time === 'string') {
      validNode.time = node.time;
    }

    if (node.parentId && typeof node.parentId === 'string') {
      validNode.parentId = node.parentId;
    }

    if (node.groupId && typeof node.groupId === 'string') {
      validNode.groupId = node.groupId;
    }

    repaired.push(validNode);
    seenIds.add(node.id);
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
