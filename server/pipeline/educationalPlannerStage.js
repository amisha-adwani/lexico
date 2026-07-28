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

const MAX_EMPTY_RESPONSE_RETRIES = 2;
const EMPTY_RESPONSE_BACKOFF_MS = 500;

function estimateTokenCount(text = "") {
  if (typeof text !== "string" || !text.length) return 0;
  return Math.ceil(text.length / 4);
}

function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }

  const promptTokens =
    usage.prompt_tokens ??
    usage.input_tokens ??
    usage.promptTokenCount ??
    usage.promptTokens ??
    null;
  const completionTokens =
    usage.completion_tokens ??
    usage.output_tokens ??
    usage.candidatesTokenCount ??
    usage.completionTokens ??
    null;
  const totalTokens =
    usage.total_tokens ??
    usage.totalTokenCount ??
    usage.totalTokens ??
    (Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
      ? promptTokens + completionTokens
      : null);

  return { promptTokens, completionTokens, totalTokens };
}

function getResponsePreview(text) {
  if (typeof text !== "string") return "";
  return text.slice(0, 500);
}

function isEmptyModelResponse(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function educationalPlannerStage(context) {
  const stageStart = nowMs();
  const metrics = [];

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
  const knowledgeModelJson = JSON.stringify(context.knowledgeModel || {});
  const knowledgeModelChars = knowledgeModelJson.length;
  const knowledgeModelEstimatedTokens = estimateTokenCount(knowledgeModelJson);
  const plannerPrompt = buildEducationalPlannerPrompt({
    knowledgeModel: context.knowledgeModel,
  });
  const plannerPromptChars = plannerPrompt?.length || 0;
  const plannerPromptEstimatedTokens = estimateTokenCount(plannerPrompt || "");
  metrics.push({
    stage: "educational_planner_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: plannerPromptChars,
    outputSize: 0,
    warnings: [],
    validationResult: "ok",
    details: [
      {
        knowledgeModelChars,
        knowledgeModelEstimatedTokens,
        plannerPromptChars,
        plannerPromptEstimatedTokens,
        totalPromptEstimatedTokens: plannerPromptEstimatedTokens,
      },
    ],
  });

  let educationalPlannerRaw;
  let plannerResponseDetails = null;
  let emptyResponseAttempts = 0;
  let generationError = null;

  for (let attempt = 1; attempt <= MAX_EMPTY_RESPONSE_RETRIES + 1; attempt += 1) {
    try {
      const aiStart = nowMs();
      plannerResponseDetails = await aiClient.generateContentDetailed(plannerPrompt);
      educationalPlannerRaw = plannerResponseDetails?.responseText ?? "";

      const usage = normalizeUsage(plannerResponseDetails?.usage);
      const isEmpty = isEmptyModelResponse(educationalPlannerRaw);
      const finishReason = plannerResponseDetails?.finishReason || null;
      const responseState = plannerResponseDetails?.responseState || (isEmpty ? "empty_text" : "ok");
      const candidateCount = Array.isArray(plannerResponseDetails?.candidates)
        ? plannerResponseDetails.candidates.length
        : 0;
      const partCount = Array.isArray(plannerResponseDetails?.responseParts)
        ? plannerResponseDetails.responseParts.length
        : 0;

      metrics.push({
        stage: attempt === 1 ? "educational_planner" : `educational_planner_attempt_${attempt}`,
        durationMs: nowMs() - aiStart,
        inputSize: plannerPromptChars,
        outputSize: educationalPlannerRaw?.length || 0,
        warnings: isEmpty ? [responseState] : [],
        validationResult: isEmpty ? "failed" : "ok",
        details: [
          {
            attempt,
            model: plannerResponseDetails?.model || null,
            temperature: plannerResponseDetails?.temperature ?? null,
            maxOutputTokens: plannerResponseDetails?.maxOutputTokens ?? null,
            timeoutMs: plannerResponseDetails?.timeoutMs ?? null,
            requestId: plannerResponseDetails?.requestId || null,
            finishReason,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            estimatedPromptTokens: plannerResponseDetails?.estimatedPromptTokens ?? plannerPromptEstimatedTokens,
            responseLength: educationalPlannerRaw?.length || 0,
            candidateCount,
            partCount,
            responseState,
            rawResponsePreview: getResponsePreview(educationalPlannerRaw),
            responsePreview: getResponsePreview(JSON.stringify(plannerResponseDetails?.response || {})),
            candidatesPreview: getResponsePreview(JSON.stringify(plannerResponseDetails?.candidates || [])),
            partsPreview: getResponsePreview(JSON.stringify(plannerResponseDetails?.responseParts || [])),
          },
        ],
      });

      if (!isEmpty) {
        generationError = null;
        break;
      }

      emptyResponseAttempts += 1;
      if (attempt <= MAX_EMPTY_RESPONSE_RETRIES) {
        const backoffMs = EMPTY_RESPONSE_BACKOFF_MS * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
      }
    } catch (error) {
      generationError = error;
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
  }

  if (generationError) {
    const pipelineResult = buildFailureResult({
      errorType: "educational_planner_generation_failed",
      stage: "Educational Planner",
      reason: "Failed to generate educational blueprint",
      options: {
        recoverable: true,
        suggestedFix: "Retry with reduced input complexity.",
        details: [generationError?.message || String(generationError)],
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

  if (isEmptyModelResponse(educationalPlannerRaw)) {
    const responseState = plannerResponseDetails?.responseState || "empty_text";
    const finishReason = plannerResponseDetails?.finishReason || "unknown";
    const candidateCount = Array.isArray(plannerResponseDetails?.candidates)
      ? plannerResponseDetails.candidates.length
      : 0;
    const usage = normalizeUsage(plannerResponseDetails?.usage);
    const pipelineResult = buildFailureResult({
      errorType: "educational_planner_empty_response",
      stage: "Educational Planner",
      reason: "Model returned no response text",
      options: {
        recoverable: true,
        suggestedFix: "Retry with smaller prompt or higher max output tokens.",
        details: [
          `response_state=${responseState}`,
          `finish_reason=${finishReason}`,
          `candidates=${candidateCount}`,
          `retries=${emptyResponseAttempts}`,
          `prompt_tokens=${usage.promptTokens ?? "unknown"}`,
          `completion_tokens=${usage.completionTokens ?? "unknown"}`,
        ],
        statusCode: 502,
      },
      payload: {
        raw: educationalPlannerRaw,
        providerResponse: plannerResponseDetails?.response || null,
      },
    });
    return failedStageResult(
      "educationalPlannerStage",
      nowMs() - stageStart,
      pipelineResult,
      [responseState],
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

  if (Array.isArray(educationalBlueprint.learningSequence)) {
    educationalBlueprint.learningSequence = educationalBlueprint.learningSequence.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      if ((!item.concept || typeof item.concept !== "string" || !item.concept.trim()) && typeof item.label === "string") {
        return { ...item, concept: item.label };
      }
      return item;
    });
  }

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
    },
    nowMs() - stageStart,
    validation.warnings || [],
    [],
    null,
    metrics
  );
}
