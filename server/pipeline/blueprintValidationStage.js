import validateSemanticBlueprint from "../utils/semanticBlueprintValidation.js";
import {
  nowMs,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

export default async function blueprintValidationStage(context) {
  const startedAt = nowMs();
  const validation = validateSemanticBlueprint(context.analysisParsed);
  const durationMs = nowMs() - startedAt;

  const metrics = [
    {
      stage: "semantic_blueprint_validation",
      durationMs,
      inputSize: context.analysisParsed,
      outputSize: validation.repaired,
      warnings: validation.warnings,
      validationResult: validation.isValid ? "ok" : "failed",
      details: validation.repairLog,
    },
  ];

  if (!validation.isValid) {
    const pipelineResult = buildFailureResult({
      errorType: "analysis_validation_failed",
      stage: "Semantic Blueprint Validation",
      reason: "Semantic blueprint is invalid",
      options: {
        recoverable: true,
        suggestedFix: "Ensure the analyzer response includes documentIntent, topologyPlan, and artifactPlans.",
        details: validation.errors,
        statusCode: 422,
      },
      payload: {
        errors: validation.errors,
        warnings: validation.warnings,
        repairLog: validation.repairLog,
        raw: context.analysisRaw,
      },
    });
    return failedStageResult(
      "blueprintValidationStage",
      durationMs,
      pipelineResult,
      validation.warnings,
      validation.errors,
      validation.repairLog,
      metrics
    );
  }

  return successStageResult(
    "blueprintValidationStage",
    {
      semanticBlueprint: validation.repaired,
      blueprintValidation: validation,
    },
    durationMs,
    validation.warnings,
    validation.errors,
    validation.repairLog,
    metrics
  );
}
