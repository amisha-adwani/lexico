import buildCanonicalPrompt from "../utils/buildCanonicalPrompt.js";
import aiClient from "../services/aiClient.js";
import {
  nowMs,
  tryParseAiJson,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

export default async function canonicalBuilderStage(context) {
  const stageStart = nowMs();
  const metrics = [];

  const promptStart = nowMs();
  const canonicalPrompt = buildCanonicalPrompt({
    chunks: context.chunks,
    sourceMap: context.sourceMap,
    documentAnalysis: context.semanticBlueprint,
  });
  metrics.push({
    stage: "canonical_builder_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: context.semanticBlueprint,
    outputSize: canonicalPrompt,
    warnings: [],
    validationResult: "ok",
  });

  let canonicalRaw;
  try {
    const buildStart = nowMs();
    canonicalRaw = await aiClient.generateContent(canonicalPrompt);
    metrics.push({
      stage: "canonical_builder",
      durationMs: nowMs() - buildStart,
      inputSize: context.semanticBlueprint,
      outputSize: canonicalRaw,
      warnings: [],
      validationResult: "ok",
    });
  } catch (error) {
    const pipelineResult = buildFailureResult({
      errorType: "builder_generation_failed",
      stage: "Canonical Builder",
      reason: "Failed to generate canonical IR",
      options: {
        recoverable: true,
        suggestedFix: "Retry generation. If the issue persists, shorten the source text or chunk size.",
        details: [error?.message || String(error)],
        statusCode: 502,
      },
      payload: { raw: canonicalRaw },
    });
    return failedStageResult("canonicalBuilderStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  const parseStart = nowMs();
  const parseResult = await tryParseAiJson(canonicalRaw);
  metrics.push({
    stage: "canonical_parse",
    durationMs: nowMs() - parseStart,
    inputSize: canonicalRaw,
    outputSize: parseResult?.parsed || {},
    warnings: parseResult.error ? [parseResult.reason || parseResult.error] : [],
    validationResult: parseResult.error ? "failed" : "ok",
  });

  if (parseResult.error) {
    const pipelineResult = buildFailureResult({
      errorType: parseResult.error,
      stage: "Canonical Validation",
      reason: "Failed to parse Canonical IR JSON",
      options: {
        recoverable: true,
        suggestedFix: "Retry generation so the builder returns valid JSON only.",
        details: [parseResult.reason || parseResult.error],
        statusCode: 422,
      },
      payload: { raw: parseResult.raw || canonicalRaw },
    });
    return failedStageResult("canonicalBuilderStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
  }

  return successStageResult(
    "canonicalBuilderStage",
    {
      canonicalRaw,
      canonicalParsed: parseResult.parsed,
    },
    nowMs() - stageStart,
    [],
    [],
    null,
    metrics
  );
}
