import validateDocument from './validators/validateDocument.js';
import validateNodes from './validators/validateNodes.js';
import validateRelations from './validators/validateRelations.js';
import validateSequences from './validators/validateSequences.js';
import validateComparisons from './validators/validateComparisons.js';
import enforceNodeLimits from './enforceNodeLimits.js';
import generateRepairGuidance from './repairGuidance.js';
import { MINIMAL_CANONICAL_IR } from './canonicalSchema.js';

function normalizeLabel(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateHierarchyChains(nodes = []) {
  const warnings = [];
  const nodeById = new Map();
  const childrenByParentId = new Map();

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || typeof node.id !== 'string') continue;
    nodeById.set(node.id, node);
    if (typeof node.parentId === 'string' && node.parentId.trim()) {
      const parentId = node.parentId.trim();
      if (!childrenByParentId.has(parentId)) childrenByParentId.set(parentId, []);
      childrenByParentId.get(parentId).push(node.id);
    }
  }

  for (const [parentId, childIds] of childrenByParentId.entries()) {
    if (!nodeById.has(parentId)) {
      warnings.push(`Hierarchy integrity: parent ${parentId} referenced by ${childIds.length} nodes is missing`);
    }
  }

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || typeof node.id !== 'string') continue;
    const seen = new Set();
    let currentId = node.id;
    while (currentId && nodeById.has(currentId)) {
      if (seen.has(currentId)) {
        warnings.push(`Hierarchy integrity: circular parent chain detected at node ${node.id}`);
        break;
      }
      seen.add(currentId);
      const currentNode = nodeById.get(currentId);
      currentId =
        typeof currentNode?.parentId === 'string' && currentNode.parentId.trim()
          ? currentNode.parentId.trim()
          : null;
    }
  }

  return warnings;
}

function validateSequenceIntegrity(ir) {
  const warnings = [];
  const nodeById = new Map((ir.nodes || []).map((node) => [node.id, node]));

  for (const sequence of ir.sequences || []) {
    if (!sequence || typeof sequence !== 'object') continue;
    const nodeIds = Array.isArray(sequence.nodeIds) ? sequence.nodeIds : [];
    if (nodeIds.length < 2) {
      warnings.push(`Sequence integrity: sequence ${sequence.id} has fewer than 2 steps after validation`);
    }

    if (String(sequence.type).toLowerCase() !== 'timeline') continue;

    const timelineNodes = nodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter(Boolean);
    const comparableTimes = timelineNodes
      .map((node) => ({ label: node.label, parsed: Date.parse(node.time), raw: node.time }))
      .filter((entry) => Number.isFinite(entry.parsed));

    for (let index = 1; index < comparableTimes.length; index += 1) {
      if (comparableTimes[index - 1].parsed > comparableTimes[index].parsed) {
        warnings.push(
          `Sequence integrity: timeline ${sequence.id} has non-monotonic time ordering near "${comparableTimes[index - 1].label}" -> "${comparableTimes[index].label}"`
        );
        break;
      }
    }

    if (comparableTimes.length === 0) {
      warnings.push(`Sequence integrity: timeline ${sequence.id} has no parseable node times`);
    }
  }

  return warnings;
}

function validateComparisonIntegrity(ir) {
  const warnings = [];
  const relationPairs = new Set();

  for (const relation of ir.relations || []) {
    const source = relation?.sourceNodeId;
    const target = relation?.targetNodeId;
    if (!source || !target) continue;
    const relationType = normalizeLabel(relation?.relationType || 'relates_to');
    if (relationType !== 'compared_to') continue;
    relationPairs.add(`${source}::${target}`);
    relationPairs.add(`${target}::${source}`);
  }

  for (const comparison of ir.comparisons || []) {
    if (!comparison || typeof comparison !== 'object') continue;
    const items = Array.isArray(comparison.items) ? comparison.items : [];
    if (items.length < 2) {
      warnings.push(`Comparison integrity: comparison ${comparison.id} has fewer than 2 items`);
      continue;
    }

    const itemIds = items.map((item) => item?.itemId).filter(Boolean);
    for (let index = 0; index < itemIds.length; index += 1) {
      for (let inner = index + 1; inner < itemIds.length; inner += 1) {
        const left = itemIds[index];
        const right = itemIds[inner];
        if (!relationPairs.has(`${left}::${right}`)) {
          warnings.push(`Comparison integrity: items ${left} and ${right} in ${comparison.id} are missing compared_to relation links`);
          inner = itemIds.length;
          break;
        }
      }
    }
  }

  return warnings;
}

export function validateCanonicalIR(data, sourceData = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = { applied: [], skipped: [] };

  let ir;
  try {
    ir = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (err) {
    errors.push(`Failed to parse JSON: ${err.message}`);
    return {
      isValid: false,
      isRepairable: false,
      ir: fallbackToMinimalIR(sourceData),
      errors,
      warnings,
      repairLog,
    };
  }

  if (!ir || typeof ir !== 'object') {
    errors.push('IR is not an object');
    return {
      isValid: false,
      isRepairable: false,
      ir: fallbackToMinimalIR(sourceData),
      errors,
      warnings,
      repairLog,
    };
  }

  const requiredFields = ['document', 'nodes', 'relations', 'sequences', 'comparisons', 'sourceMap'];
  for (const field of requiredFields) {
    if (!(field in ir)) {
      repairLog.applied.push(`Added missing top-level field: ${field}`);
      ir[field] = field === 'document' ? {} : field === 'sourceMap' ? {} : [];
    }
  }

  const documentValidation = validateDocument(ir.document, sourceData);
  if (!documentValidation.isValid) {
    errors.push(...documentValidation.errors);
  }
  if (documentValidation.isRepairable) {
    repairLog.applied.push(...documentValidation.repairLog);
    ir.document = documentValidation.repaired;
  }
  warnings.push(...documentValidation.warnings);

  const nodesValidation = validateNodes(ir.nodes, ir.sourceMap);
  if (!nodesValidation.isValid && nodesValidation.errors.length > 0) {
    errors.push(`Nodes validation: ${nodesValidation.errors.join('; ')}`);
  }
  warnings.push(...nodesValidation.warnings);
  ir.nodes = nodesValidation.repaired;
  repairLog.applied.push(...nodesValidation.repairLog);

  const relationsValidation = validateRelations(ir.relations, ir.nodes, ir.sourceMap);
  if (!relationsValidation.isValid) {
    errors.push(...relationsValidation.errors);
  }
  warnings.push(...relationsValidation.warnings);
  ir.relations = relationsValidation.repaired;
  repairLog.applied.push(...relationsValidation.repairLog);

  const sequencesValidation = validateSequences(ir.sequences, ir.nodes, ir.sourceMap);
  if (!sequencesValidation.isValid) {
    errors.push(...sequencesValidation.errors);
  }
  warnings.push(...sequencesValidation.warnings);
  ir.sequences = sequencesValidation.repaired;
  repairLog.applied.push(...sequencesValidation.repairLog);

  const comparisonsValidation = validateComparisons(ir.comparisons, ir.nodes, ir.sourceMap);
  if (!comparisonsValidation.isValid) {
    errors.push(...comparisonsValidation.errors);
  }
  warnings.push(...comparisonsValidation.warnings);
  ir.comparisons = comparisonsValidation.repaired;
  repairLog.applied.push(...comparisonsValidation.repairLog);

  const limitsValidation = enforceNodeLimits(ir);
  if (limitsValidation.repaired) {
    ir.nodes = limitsValidation.repaired.nodes;
    ir.relations = limitsValidation.repaired.relations;
    ir.sequences = limitsValidation.repaired.sequences;
    ir.comparisons = limitsValidation.repaired.comparisons;
  }
  warnings.push(...limitsValidation.warnings);
  repairLog.applied.push(...limitsValidation.repairLog);

  warnings.push(...validateHierarchyChains(ir.nodes));
  warnings.push(...validateSequenceIntegrity(ir));
  warnings.push(...validateComparisonIntegrity(ir));

  const isValid = errors.length === 0;
  const isRepairable = repairLog.applied.length > 0 && (errors.length === 0 || isRepairableError(errors));

  return {
    isValid,
    isRepairable,
    ir,
    errors,
    warnings,
    repairLog,
  };
}

function fallbackToMinimalIR(sourceData = {}) {
  const fallback = JSON.parse(JSON.stringify(MINIMAL_CANONICAL_IR));

  if (sourceData.documentTitle) {
    fallback.document.title = sourceData.documentTitle;
  }
  if (sourceData.sourceFingerprint) {
    fallback.document.sourceFingerprint = sourceData.sourceFingerprint;
  }

  return fallback;
}

function isRepairableError(errors) {
  return errors.every(
    (err) =>
      !err.includes('Failed to parse JSON') &&
      !err.includes('IR is not an object') &&
      !err.includes('must be an array')
  );
}

export { generateRepairGuidance };
export default validateCanonicalIR;
