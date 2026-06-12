export function validateSourceRefs(sourceRefs, sourceMap = {}, options = {}) {
  const { repairLog, ownerDescription = 'item' } = options;

  if (!Array.isArray(sourceRefs)) {
    return [];
  }

  const validRefs = sourceRefs.filter((ref) => {
    if (!ref || typeof ref !== 'object' || typeof ref.sourceId !== 'string') {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(sourceMap, ref.sourceId);
  });

  if (repairLog && validRefs.length !== sourceRefs.length) {
    const invalidCount = sourceRefs.length - validRefs.length;
    repairLog.push(`Cleaned ${invalidCount} invalid sourceRefs from ${ownerDescription}`);
  }

  return validRefs;
}
