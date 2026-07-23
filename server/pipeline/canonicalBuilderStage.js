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
  const educationalBlueprint = context.educationalBlueprint;

  const canonicalPrompt = buildCanonicalPrompt({
    chunks: context.chunks,
    sourceMap: context.sourceMap,
    educationalBlueprint,
  });
  metrics.push({
    stage: "canonical_builder_prompt",
    durationMs: nowMs() - promptStart,
    inputSize: educationalBlueprint,
    outputSize: canonicalPrompt,
    warnings: [],
    validationResult: "ok",
  });

  const attemptGeneration = async (attemptNumber) => {
    let canonicalRaw;
    try {
      const buildStart = nowMs();
      canonicalRaw = await aiClient.generateContent(canonicalPrompt);
      metrics.push({
        stage: `canonical_builder_attempt_${attemptNumber}`,
        durationMs: nowMs() - buildStart,
        inputSize: educationalBlueprint,
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
      return { success: false, pipelineResult, canonicalRaw };
    }

    const parseStart = nowMs();
    const parseResult = await tryParseAiJson(canonicalRaw);
    metrics.push({
      stage: `canonical_parse_attempt_${attemptNumber}`,
      durationMs: nowMs() - parseStart,
      inputSize: canonicalRaw,
      outputSize: parseResult?.parsed || {},
      warnings: parseResult.error ? [parseResult.reason || parseResult.error] : [],
      validationResult: parseResult.error ? "failed" : "ok",
    });

    if (parseResult.error) {
      return { success: false, parseResult, canonicalRaw };
    }

    return {
      success: true,
      canonicalRaw,
      canonicalParsed: parseResult.parsed,
      canonicalIR: parseResult.parsed,
    };
  };

  const firstAttempt = await attemptGeneration(1);
  if (firstAttempt.success) {
    return successStageResult(
      "canonicalBuilderStage",
      {
        canonicalRaw: firstAttempt.canonicalRaw,
        canonicalParsed: firstAttempt.canonicalParsed,
        canonicalIR: firstAttempt.canonicalIR,
      },
      nowMs() - stageStart,
      [],
      [],
      null,
      metrics
    );
  }

  const retryAttempt = await attemptGeneration(2);
  if (retryAttempt.success) {
    return successStageResult(
      "canonicalBuilderStage",
      {
        canonicalRaw: retryAttempt.canonicalRaw,
        canonicalParsed: retryAttempt.canonicalParsed,
        canonicalIR: retryAttempt.canonicalIR,
      },
      nowMs() - stageStart,
      [],
      [],
      null,
      metrics
    );
  }

  const failureSource = firstAttempt.pipelineResult || retryAttempt.pipelineResult || {
    errorType: firstAttempt.parseResult?.error || retryAttempt.parseResult?.error || "parse_failed",
    stage: "Canonical Validation",
    reason: "Failed to parse Canonical IR JSON",
    options: {
      recoverable: true,
      suggestedFix: "Retry generation so the builder returns valid JSON only.",
      details: [(firstAttempt.parseResult?.reason || retryAttempt.parseResult?.reason || "Unable to parse AI JSON response")],
      statusCode: 422,
    },
    payload: { raw: retryAttempt.canonicalRaw || firstAttempt.canonicalRaw },
  };

  const pipelineResult = buildFailureResult({
    errorType: failureSource.errorType,
    stage: failureSource.stage,
    reason: failureSource.reason,
    options: failureSource.options,
    payload: failureSource.payload,
  });

  return failedStageResult("canonicalBuilderStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
}
