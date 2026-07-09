import buildDocumentAnalysisPrompt from "../utils/buildDocumentAnalysisPrompt.js";
import aiClient from "../services/aiClient.js";
import {
  nowMs,
  tryParseAiJson,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

/**
 * LEGACY COMPATIBILITY STAGE - Not the primary reasoning stage
 *
 * STATUS: Temporary backward compatibility layer (Phase 1 transition)
 *
 * NOTE: Knowledge Extraction (knowledgeExtractionStage) is now the authoritative
 * first AI reasoning stage and produces the primary artifact (knowledgeModel).
 *
 * This stage exists only to maintain compatibility with downstream stages that
 * may still reference analysisParsed. It will be deprecated when Educational
 * Planner is implemented in Phase 2.
 *
 * Do NOT add new functionality to this stage.
 * Do NOT make this stage produce the canonical handoff.
 * Do NOT reference this stage in new feature work.
 *
 * All new reasoning work should be added to:
 * 1. Knowledge Extraction (Phase 1 - semantic discovery)
 * 2. Educational Planner (Phase 2 - pedagogical planning)
 *
 * ROADMAP:
 * Phase 1 (current): analysisStage is compatibility layer only
 * Phase 2: Educational Planner replaces analysisStage as the planning stage
 * Phase 2+: analysisStage and analysisParsed are fully deprecated
 */

export default async function analysisStage(context) {
  const stageStart = nowMs();
  const metrics = [];

  const promptStart = nowMs();
  const analysisPrompt = buildDocumentAnalysisPrompt({ chunks: context.chunks });
  metrics.push({
    stage: "document_analysis_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: context.chunks,
    outputSize: analysisPrompt,
    warnings: [],
    validationResult: "ok",
  });

  let analysisRaw;
  try {
    const analysisStart = nowMs();
    analysisRaw = await aiClient.generateContent(analysisPrompt);
    metrics.push({
      stage: "document_analyzer",
      durationMs: nowMs() - analysisStart,
      inputSize: context.chunks,
      outputSize: analysisRaw,
      warnings: [],
      validationResult: "ok",
    });
  } catch (error) {
    const pipelineResult = buildFailureResult({
      errorType: "analysis_generation_failed",
      stage: "Document Analyzer (Legacy)",
      reason: "Failed to generate semantic blueprint",
      options: {
        recoverable: true,
        suggestedFix: "Retry the request, or reduce input complexity to improve model stability.",
        details: [error?.message || String(error)],
        statusCode: 502,
      },
      payload: { raw: analysisRaw },
    });
    return failedStageResult("analysisStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  const parseStart = nowMs();
  const analysisResult = await tryParseAiJson(analysisRaw);
  metrics.push({
    stage: "semantic_blueprint_parse",
    durationMs: nowMs() - parseStart,
    inputSize: analysisRaw,
    outputSize: analysisResult?.parsed || {},
    warnings: analysisResult.error ? [analysisResult.reason || analysisResult.error] : [],
    validationResult: analysisResult.error ? "failed" : "ok",
  });

  if (analysisResult.error) {
    const pipelineResult = buildFailureResult({
      errorType: analysisResult.error,
      stage: "Semantic Blueprint Validation (Legacy)",
      reason: "Failed to parse semantic blueprint JSON",
      options: {
        recoverable: true,
        suggestedFix: "Retry the request so the model can return valid JSON.",
        details: [analysisResult.reason || analysisResult.error],
        statusCode: 422,
      },
      payload: { raw: analysisResult.raw || analysisRaw },
    });
    return failedStageResult("analysisStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  return successStageResult(
    "analysisStage",
    {
      // LEGACY: For backward compatibility only. Use knowledgeModel from knowledgeExtractionStage instead.
      analysisRaw,
      analysisParsed: analysisResult.parsed,
    },
    nowMs() - stageStart,
    [],
    [],
    null,
    metrics
  );
}
