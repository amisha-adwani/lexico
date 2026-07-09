/**
 * Knowledge Extraction Stage
 *
 * Frozen Stage
 *
 * Input:
 *   Chunk Contract
 *
 * Output:
 *   Knowledge Model
 *
 * Responsibility:
 *   Discover educational knowledge.
 *
 * Never:
 *   Build graphs.
 *   Plan learning order.
 *   Generate IDs.
 */
import buildKnowledgeExtractionPrompt from "../utils/buildKnowledgeExtractionPrompt.js";
import { validateKnowledgeModel, KNOWLEDGE_MODEL_VERSION } from "../utils/knowledgeModelSchema.js";
import aiClient from "../services/aiClient.js";
import {
  nowMs,
  tryParseAiJson,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

export default async function knowledgeExtractionStage(context) {
  const stageStart = nowMs();
  const metrics = [];

  // Build extraction prompt
  const promptStart = nowMs();
  const extractionPrompt = buildKnowledgeExtractionPrompt({
    chunks: context.chunks,
    sourceMap: context.sourceMap,
    documentMetadata: {
      title: context.request.documentTitle,
      sourceFingerprint: context.request.sourceFingerprint,
    },
  });
  metrics.push({
    stage: "knowledge_extraction_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: extractionPrompt?.length || 0,
    outputSize: 0,
    warnings: [],
    validationResult: "ok",
  });

  let extractionRaw;
  try {
    const aiStart = nowMs();
    extractionRaw = await aiClient.generateContent(extractionPrompt);
    metrics.push({
      stage: "knowledge_extractor",
      durationMs: nowMs() - aiStart,
      inputSize: extractionPrompt?.length || 0,
      outputSize: extractionRaw?.length || 0,
      warnings: [],
      validationResult: "ok",
    });
  } catch (error) {
    const pipelineResult = buildFailureResult({
      errorType: "knowledge_extraction_generation_failed",
      stage: "Knowledge Extractor",
      reason: "Failed to generate knowledge model",
      options: {
        recoverable: true,
        suggestedFix: "Retry with reduced input complexity.",
        details: [error?.message || String(error)],
        statusCode: 502,
      },
      payload: { raw: extractionRaw },
    });
    return failedStageResult("knowledgeExtractionStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  const parseStart = nowMs();
  const extractionResult = await tryParseAiJson(extractionRaw);
  metrics.push({
    stage: "knowledge_model_parse",
    durationMs: nowMs() - parseStart,
    inputSize: extractionRaw?.length || 0,
    outputSize: extractionResult?.parsed ? JSON.stringify(extractionResult.parsed).length : 0,
    warnings: extractionResult.error ? [extractionResult.reason || extractionResult.error] : [],
    validationResult: extractionResult.error ? "failed" : "ok",
  });

  if (extractionResult.error) {
    const pipelineResult = buildFailureResult({
      errorType: extractionResult.error,
      stage: "Knowledge Model Parse",
      reason: "Invalid JSON response",
      options: {
        recoverable: true,
        suggestedFix: "Retry so model returns valid JSON.",
        details: [extractionResult.reason || extractionResult.error],
        statusCode: 422,
      },
      payload: { raw: extractionResult.raw || extractionRaw },
    });
    return failedStageResult("knowledgeExtractionStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  const knowledgeModel = extractionResult.parsed;
  const validationStart = nowMs();
  const validation = validateKnowledgeModel(knowledgeModel);
  metrics.push({
    stage: "knowledge_model_schema_validation",
    durationMs: nowMs() - validationStart,
    inputSize: JSON.stringify(knowledgeModel || {}).length,
    outputSize: validation.isFatal ? 0 : JSON.stringify(knowledgeModel).length,
    warnings: validation.warnings || [],
    validationResult: validation.isFatal ? "failed" : "ok",
  });

  // FATAL: Stop pipeline if contract is violated
  if (validation.isFatal) {
    const pipelineResult = buildFailureResult({
      errorType: "knowledge_model_schema_error",
      stage: "Knowledge Model Validation",
      reason: "Knowledge model missing required fields",
      options: {
        recoverable: true,
        suggestedFix: "Ensure AI generates complete version, metadata, and quality fields.",
        details: validation.fatalErrors,
        statusCode: 422,
      },
      payload: { fatalErrors: validation.fatalErrors, warnings: validation.warnings, raw: extractionRaw },
    });
    return failedStageResult("knowledgeExtractionStage", nowMs() - stageStart, pipelineResult, validation.warnings, validation.fatalErrors, null, metrics);
  }

  // WARNINGS: Log recoverable issues but continue (extraction is best-effort)
  if (validation.warnings.length > 0) {
    context.diagnostics = context.diagnostics || [];
    context.diagnostics.push({
      stage: "Knowledge Extraction",
      severity: "warning",
      message: "Extraction incomplete",
      details: validation.warnings,
    });
  }

  // Ensure version is set
  if (!knowledgeModel.knowledgeModelVersion) {
    knowledgeModel.knowledgeModelVersion = KNOWLEDGE_MODEL_VERSION;
  }

  // Ensure document metadata is set
  if (!knowledgeModel.documentMetadata) {
    knowledgeModel.documentMetadata = {};
  }
  knowledgeModel.documentMetadata.title =
    knowledgeModel.documentMetadata.title || context.request.documentTitle || "Untitled";
  knowledgeModel.documentMetadata.sourceFingerprint =
    knowledgeModel.documentMetadata.sourceFingerprint || context.request.sourceFingerprint || "";
  knowledgeModel.documentMetadata.language = knowledgeModel.documentMetadata.language || "en";

// Primary stage output
 return successStageResult(
    "knowledgeExtractionStage",
    {
      knowledgeModel, // primary: canonical handoff to downstream
      extractionRaw, // internal: raw AI response
    },
    nowMs() - stageStart,
    validation.warnings || [],
    [],
    null,
    metrics
  );
}
