export default function generateRepairGuidance(validationResult) {
  const { errors, warnings, repairLog, ir } = validationResult;

  if (validationResult.isValid) {
    return null;
  }

  let guidance = '## Validation Feedback\n\n';

  if (errors.length > 0) {
    guidance += '### Errors\n';
    errors.forEach((err) => {
      guidance += `- ${err}\n`;
    });
    guidance += '\n';
  }

  if (warnings.length > 0) {
    guidance += '### Warnings\n';
    warnings.forEach((warn) => {
      guidance += `- ${warn}\n`;
    });
    guidance += '\n';
  }

  guidance += '### Current IR Statistics\n';
  guidance += `- Nodes: ${ir.nodes?.length || 0}\n`;
  guidance += `- Relations: ${ir.relations?.length || 0}\n`;
  guidance += `- Sequences: ${ir.sequences?.length || 0}\n`;
  guidance += `- Comparisons: ${ir.comparisons?.length || 0}\n`;
  guidance += `- Source refs: ${Object.keys(ir.sourceMap || {}).length}\n`;

  if (repairLog && repairLog.length > 0) {
    guidance += '\n### Repair actions\n';
    repairLog.forEach((entry) => {
      guidance += `- ${entry}\n`;
    });
  }

  return guidance;
}
