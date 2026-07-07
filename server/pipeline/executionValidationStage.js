import validateBlueprintExecution from "../utils/blueprintExecutionValidation.js";
import {
  nowMs,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

export default async function executionValidationStage(context) {
  const startedAt = nowMs();
  const executionValidation = validateBlueprintExecution(context.semanticBlueprint, context.canonicalIR);
  const durationMs = nowMs() - startedAt;

  const metrics = [
    {
      stage: "blueprint_execution_validation",
      durationMs,
      inputSize: context.semanticBlueprint,
      outputSize: executionValidation.diagnostics || executionValidation.details,
      warnings: executionValidation.warnings,
      validationResult: executionValidation.warnings.length > 0 ? "warnings" : "ok",
    },
  ];

  const blueprintWarnings = (context.blueprintValidation?.warnings || []).map(
    (warning) => `semantic blueprint: ${warning}`
  );
  const coverageWarnings = executionValidation.warnings;
  const coverageDetails = executionValidation.details.map(
    (detail) => `semantic blueprint: ${detail}`
  );
  const combinedWarnings = [
    ...blueprintWarnings,
    ...(context.canonicalValidation?.warnings || []),
    ...coverageWarnings,
    ...coverageDetails,
  ];

  if (!context.canonicalValidation?.isValid && !context.canonicalValidation?.isRepairable) {
    const pipelineResult = buildFailureResult({
      errorType: "validation_failed",
      stage: "Canonical Validation",
      reason: "Canonical IR validation failed",
      options: {
        recoverable: false,
        suggestedFix: "Update builder output to satisfy schema and graph integrity validators.",
        details: context.canonicalValidation?.errors || [],
        statusCode: 422,
      },
      payload: {
        errors: context.canonicalValidation?.errors || [],
        warnings: combinedWarnings,
        repairLog: context.canonicalValidation?.repairLog,
        ir: context.canonicalIR,
      },
    });
    return failedStageResult(
      "executionValidationStage",
      durationMs,
      pipelineResult,
      combinedWarnings,
      context.canonicalValidation?.errors || [],
      context.canonicalValidation?.repairLog,
      metrics
    );
  }

  const result = {
    success: true,
    ir: context.canonicalIR,
    errors: context.canonicalValidation?.errors || [],
    warnings: combinedWarnings,
    repairLog: context.canonicalValidation?.repairLog,
  };

  return successStageResult(
    "executionValidationStage",
    {
      executionValidation,
      warnings: combinedWarnings,
      result,
    },
    durationMs,
    combinedWarnings,
    context.canonicalValidation?.errors || [],
    context.canonicalValidation?.repairLog,
    metrics
  );
}
