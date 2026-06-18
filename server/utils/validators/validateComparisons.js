export default function validateComparisons(comparisons, nodes = [], sourceMap = {}) {
  const errors = [];
  const warnings = [];
  const repairLog = [];

  if (!Array.isArray(comparisons)) {
    errors.push('comparisons must be an array');
    return { isValid: false, isRepairable: false, errors, warnings, repairLog, repaired: [] };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const repaired = [];
  const seenIds = new Set();

  for (const comparison of comparisons) {
    if (!comparison || typeof comparison !== 'object') {
      warnings.push('Skipped invalid comparison (not an object)');
      continue;
    }

    if (!comparison.id || typeof comparison.id !== 'string') {
      warnings.push('Skipped comparison without valid id');
      continue;
    }

    if (seenIds.has(comparison.id)) {
      warnings.push(`Skipped duplicate comparison id: ${comparison.id}`);
      continue;
    }

    if (!comparison.label || typeof comparison.label !== 'string') {
      warnings.push(`Comparison ${comparison.id}: missing or invalid label`);
      continue;
    }

    if (!Array.isArray(comparison.items) || comparison.items.length === 0) {
      warnings.push(`Comparison ${comparison.id}: items must be a non-empty array`);
      continue;
    }

    const validItems = comparison.items
      .map((item) => {
        if (!item || typeof item !== 'object') {
          warnings.push(`Comparison ${comparison.id}: skipped invalid item`);
          return null;
        }
        if (!item.itemId || !nodeIds.has(item.itemId)) {
          warnings.push(`Comparison ${comparison.id}: references non-existent item ${item?.itemId}`);
          return null;
        }
        if (!item.name || typeof item.name !== 'string') {
          warnings.push(`Comparison ${comparison.id}: item missing or invalid name`);
          return null;
        }

        // NORMALIZE CRITERIA TO ARRAY
        let criteria = item.criteria || [];
        
        // If criteria is a string, convert it to an array with a single criterion
        if (typeof criteria === 'string') {
          repairLog.push(
            `Comparison ${comparison.id} item ${item.itemId}: converted string criteria to array`
          );
          criteria = [{ criterion: 'Description', value: criteria }];
        }
        
        // Ensure criteria is an array
        if (!Array.isArray(criteria)) {
          repairLog.push(
            `Comparison ${comparison.id} item ${item.itemId}: normalized criteria to array`
          );
          criteria = [];
        }
        
        // Validate each criterion has proper structure
        const validCriteria = criteria.map(crit => {
          if (!crit || typeof crit !== 'object') {
            warnings.push(
              `Comparison ${comparison.id} item ${item.itemId}: invalid criterion object`
            );
            return null;
          }
          return {
            criterion: crit.criterion || 'Property',
            value: String(crit.value || ''),
          };
        }).filter(Boolean);

        return {
          itemId: item.itemId,
          name: item.name,
          criteria: validCriteria,
        };
      })
      .filter(Boolean);

    if (validItems.length > 0 && validItems.length !== comparison.items.length) {
      repairLog.push(`Removed invalid items from comparison ${comparison.id}`);
    }

    if (validItems.length === 0) {
      warnings.push(`Comparison ${comparison.id}: no valid items`);
      continue;
    }

    repaired.push({
      id: comparison.id,
      label: comparison.label,
      items: validItems,
    });
    seenIds.add(comparison.id);
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
