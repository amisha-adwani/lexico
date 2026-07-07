import { clampImportance } from '../canonicalSchema.js';
import { validateSourceRefs } from './validateSourceRefs.js';

function detectCycle(nodeId, parentById) {
  const path = [];
  const indexByNodeId = new Map();
  let currentId = nodeId;

  while (currentId && parentById.has(currentId)) {
    const existingIndex = indexByNodeId.get(currentId);
    if (existingIndex !== undefined) {
      return path[path.length - 1] || currentId;
    }

    indexByNodeId.set(currentId, path.length);
    path.push(currentId);
    currentId = parentById.get(currentId);
  }

  return null;
}

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
  const seenLabels = new Map();
  const nodeIds = new Set(
    nodes.filter((node) => node && typeof node === 'object' && typeof node.id === 'string').map((node) => node.id)
  );
  const parentById = new Map();

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    if (!node.id || typeof node.id !== 'string') continue;
    if (typeof node.parentId === 'string' && node.parentId.trim()) {
      parentById.set(node.id, node.parentId.trim());
    }
  }

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

    const normalizedLabel = node.label.trim();
    const labelKey = normalizedLabel.toLowerCase();
    if (seenLabels.has(labelKey)) {
      warnings.push(`Duplicate label detected for node ${node.id}: ${normalizedLabel}`);
    } else {
      seenLabels.set(labelKey, node.id);
    }

    const originalImportance = node.importance;
    const importance = clampImportance(originalImportance);
    if (originalImportance !== importance) {
      repairLog.push(
        `Normalized importance for node ${node.id} from ${originalImportance === undefined ? 'undefined' : originalImportance} to ${importance}`
      );
    }

    const sourceRefs = validateSourceRefs(node.sourceRefs, sourceMap, {
      repairLog,
      ownerDescription: `node ${node.id}`,
    });
    if (sourceRefs.length === 0) {
      warnings.push(`Node ${node.id} has no valid sourceRefs`);
      continue;
    }

    let parentId = null;
    if (typeof node.parentId === 'string' && node.parentId.trim()) {
      parentId = node.parentId.trim();
      if (!nodeIds.has(parentId)) {
        warnings.push(`Node ${node.id} references missing parent ${parentId}`);
        parentId = null;
        repairLog.push(`Removed invalid parentId from node ${node.id}`);
      } else {
        const cycleNodeId = detectCycle(node.id, parentById);
        if (cycleNodeId === node.id) {
          warnings.push(`Node ${node.id} participates in a circular parent chain`);
          parentId = null;
          repairLog.push(`Removed circular parentId from node ${node.id}`);
        }
      }
    }

    const validNode = {
      id: node.id,
      type: node.type,
      label: normalizedLabel,
      importance,
      sourceRefs,
    };

    if (node.summary && typeof node.summary === 'string') {
      validNode.summary = node.summary.trim();
    }

    if (node.time && typeof node.time === 'string') {
      validNode.time = node.time;
    }

    if (parentId) {
      validNode.parentId = parentId;
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
