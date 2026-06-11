import validateDocument from './validators/validateDocument.js';
import validateNodes from './validators/validateNodes.js';
import validateRelations from './validators/validateRelations.js';
import validateSequences from './validators/validateSequences.js';
import validateComparisons from './validators/validateComparisons.js';
import enforceNodeLimits from './enforceNodeLimits.js';
import generateRepairGuidance from './repairGuidance.js';
import { MINIMAL_CANONICAL_IR } from './canonicalSchema.js';

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