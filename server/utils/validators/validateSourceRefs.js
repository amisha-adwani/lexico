export function validateSourceRefs(sourceRefs, sourceMap = {}) {
  if (!Array.isArray(sourceRefs)) {
    return [];
  }

  return sourceRefs.filter((ref) => {
    if (!ref || typeof ref !== 'object' || typeof ref.sourceId !== 'string') {
      return false;
    }

    return Object.prototype.hasOwnProperty.call(sourceMap, ref.sourceId);
  });
}
