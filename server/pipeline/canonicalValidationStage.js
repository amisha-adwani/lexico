import validateCanonicalIR from "../utils/canonicalValidation.js";
import { nowMs, successStageResult } from "./stageUtils.js";

export default async function canonicalValidationStage(context) {
  const startedAt = nowMs();
  const aiIr = context.canonicalParsed;
  aiIr.sourceMap = context.sourceMap;

  const validation = validateCanonicalIR(aiIr, {
    documentTitle: context.request.documentTitle,
    sourceFingerprint: context.request.sourceFingerprint,
  });

  const finalIr = validation.ir || aiIr;
  finalIr.sourceMap = context.sourceMap;
  const durationMs = nowMs() - startedAt;

  return successStageResult(
    "canonicalValidationStage",
    {
      canonicalValidation: validation,
      canonicalIR: finalIr,
    },
    durationMs,
    validation.warnings,
    validation.errors,
    validation.repairLog,
    [
      {
        stage: "canonical_validation",
        durationMs,
        inputSize: aiIr,
        outputSize: validation.ir,
        warnings: validation.warnings,
        validationResult: validation.isValid ? "ok" : validation.isRepairable ? "repaired" : "failed",
        details: validation.repairLog?.applied || [],
      },
    ]
  );
}
