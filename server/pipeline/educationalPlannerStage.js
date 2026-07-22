/**
 * Educational Planner Stage
 *
 * Input:
 *   Knowledge Model
 *
 * Output:
 *   Educational Blueprint
 *
 * Responsibility:
 *   Convert knowledge into a pedagogically ordered learning plan.
 *
 * Never:
 *   Invent knowledge.
 *   Build graph structures.
 *   Create renderer data.
 */
import buildEducationalPlannerPrompt from "../utils/buildEducationalPlannerPrompt.js";
import {
  validateEducationalBlueprint,
  EDUCATIONAL_BLUEPRINT_VERSION,
} from "../utils/educationalBlueprintSchema.js";
import aiClient from "../services/aiClient.js";
import {
  nowMs,
  tryParseAiJson,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

export default async function educationalPlannerStage(context) {
  const stageStart = nowMs();
  const metrics = [];
  console.log(
  JSON.stringify('knowledge model',context.knowledgeModel, null, 2));

  if (!context?.knowledgeModel || typeof context.knowledgeModel !== "object") {
    const pipelineResult = buildFailureResult({
      errorType: "educational_planner_missing_knowledge_model",
      stage: "Educational Planner",
      reason: "Knowledge model was not provided",
      options: {
        recoverable: true,
        suggestedFix: "Ensure knowledge extraction completed before planning.",
        details: ["context.knowledgeModel is missing or invalid"],
        statusCode: 422,
      },
      payload: {},
    });
    return failedStageResult(
      "educationalPlannerStage",
      nowMs() - stageStart,
      pipelineResult,
      [],
      [],
      null,
      metrics
    );
  }

  const promptStart = nowMs();
  const plannerPrompt = buildEducationalPlannerPrompt({
    knowledgeModel: context.knowledgeModel,
  });
  metrics.push({
    stage: "educational_planner_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: plannerPrompt?.length || 0,
    outputSize: 0,
    warnings: [],
    validationResult: "ok",
  });

  let educationalPlannerRaw;
  try {
    const aiStart = nowMs();
    educationalPlannerRaw = await aiClient.generateContent(plannerPrompt);
    metrics.push({
      stage: "educational_planner",
      durationMs: nowMs() - aiStart,
      inputSize: plannerPrompt?.length || 0,
      outputSize: educationalPlannerRaw?.length || 0,
      warnings: [],
      validationResult: "ok",
    });
  } catch (error) {
    const pipelineResult = buildFailureResult({
      errorType: "educational_planner_generation_failed",
      stage: "Educational Planner",
      reason: "Failed to generate educational blueprint",
      options: {
        recoverable: true,
        suggestedFix: "Retry with reduced input complexity.",
        details: [error?.message || String(error)],
        statusCode: 502,
      },
      payload: { raw: educationalPlannerRaw },
    });
    return failedStageResult(
      "educationalPlannerStage",
      nowMs() - stageStart,
      pipelineResult,
      [],
      [],
      null,
      metrics
    );
  }

  const parseStart = nowMs();
  const parseResult = await tryParseAiJson(educationalPlannerRaw);
  metrics.push({
    stage: "educational_blueprint_parse",
    durationMs: nowMs() - parseStart,
    inputSize: educationalPlannerRaw?.length || 0,
    outputSize: parseResult?.parsed ? JSON.stringify(parseResult.parsed).length : 0,
    warnings: parseResult.error ? [parseResult.reason || parseResult.error] : [],
    validationResult: parseResult.error ? "failed" : "ok",
  });

  if (parseResult.error) {
    const pipelineResult = buildFailureResult({
      errorType: parseResult.error,
      stage: "Educational Blueprint Parse",
      reason: "Invalid JSON response",
      options: {
        recoverable: true,
        suggestedFix: "Retry so the model returns valid JSON.",
        details: [parseResult.reason || parseResult.error],
        statusCode: 422,
      },
      payload: { raw: parseResult.raw || educationalPlannerRaw },
    });
    return failedStageResult(
      "educationalPlannerStage",
      nowMs() - stageStart,
      pipelineResult,
      [],
      [],
      null,
      metrics
    );
  }

  let educationalBlueprint = parseResult.parsed;
  const validationStart = nowMs();
  const validation = validateEducationalBlueprint(educationalBlueprint);
  metrics.push({
    stage: "educational_blueprint_validation",
    durationMs: nowMs() - validationStart,
    inputSize: JSON.stringify(educationalBlueprint || {}).length,
    outputSize: validation.isFatal ? 0 : JSON.stringify(educationalBlueprint).length,
    warnings: validation.warnings || [],
    validationResult: validation.isFatal ? "failed" : "ok",
  });

  if (validation.isFatal) {
    const pipelineResult = buildFailureResult({
      errorType: "educational_blueprint_schema_error",
      stage: "Educational Blueprint Validation",
      reason: "Educational blueprint missing required fields",
      options: {
        recoverable: true,
        suggestedFix: "Ensure the planner returns a complete blueprint with required planning fields.",
        details: validation.fatalErrors,
        statusCode: 422,
      },
      payload: {
        fatalErrors: validation.fatalErrors,
        warnings: validation.warnings,
        raw: educationalPlannerRaw,
      },
    });
    return failedStageResult(
      "educationalPlannerStage",
      nowMs() - stageStart,
      pipelineResult,
      validation.warnings || [],
      validation.fatalErrors || [],
      null,
      metrics
    );
  }

  if (validation.warnings.length > 0) {
    context.diagnostics = context.diagnostics || [];
    context.diagnostics.push({
      stage: "Educational Planner",
      severity: "warning",
      message: "Blueprint incomplete",
      details: validation.warnings,
    });
  }

  if (!educationalBlueprint.blueprintVersion) {
    educationalBlueprint.blueprintVersion = EDUCATIONAL_BLUEPRINT_VERSION;
  }
  if (!educationalBlueprint.timestamp) {
    educationalBlueprint.timestamp = new Date().toISOString();
  }

  const documentMetadata = context.knowledgeModel?.documentMetadata || {};
  if (!educationalBlueprint.documentIntent || typeof educationalBlueprint.documentIntent !== "object") {
    educationalBlueprint.documentIntent = {};
  }
  educationalBlueprint.documentIntent.topic =
    educationalBlueprint.documentIntent.topic ||
    documentMetadata.title ||
    "Untitled";

  // Primary stage output
  return successStageResult(
    "educationalPlannerStage",
    {
      educationalBlueprint,
      educationalPlannerRaw,
      educationalPlannerRaw,
    },
    nowMs() - stageStart,
    validation.warnings || [],
    [],
    null,
    metrics
  );
}