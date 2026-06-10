import { SCHEMA_VERSION } from '../canonicalSchema.js';

export default function validateDocument(document, sourceData = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = [];
  const repaired = document && typeof document === 'object' ? { ...document } : {};

  if (!repaired.schemaVersion) {
    repaired.schemaVersion = SCHEMA_VERSION;
    repairLog.push('Set schemaVersion to default');
  } else if (repaired.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(`Schema version mismatch: expected ${SCHEMA_VERSION}, got ${repaired.schemaVersion}`);
  }

  if (!repaired.title || typeof repaired.title !== 'string') {
    repaired.title = sourceData.documentTitle || 'Untitled';
    repairLog.push('Set title to default or source data');
  }

  if (!repaired.summary || typeof repaired.summary !== 'string') {
    repaired.summary = 'Document processed by canonical IR pipeline.';
    repairLog.push('Set summary to default');
  }

  if (!repaired.language || typeof repaired.language !== 'string') {
    repaired.language = 'en';
    repairLog.push('Set language to default (en)');
  }

  if (!repaired.sourceFingerprint || typeof repaired.sourceFingerprint !== 'string') {
    repaired.sourceFingerprint = sourceData.sourceFingerprint || '';
    repairLog.push('Set sourceFingerprint from source data');
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
