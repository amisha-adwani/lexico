import cleanJSON from "../utils/cleanJSON.js";
import { createStageError } from "../utils/logging.js";

export function nowMs() {
  return Date.now();
}

export async function tryParseAiJson(raw) {
  if (!raw || typeof raw !== "string") return { error: "no_response", raw };

  try {
    const cleaned = cleanJSON(raw);
    return { parsed: JSON.parse(cleaned), cleaned };
  } catch (err) {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = raw.slice(firstBrace, lastBrace + 1);
      try {
        const cleaned = cleanJSON(candidate);
        return { parsed: JSON.parse(cleaned), cleaned, extracted: true };
      } catch (parseErr) {
        return { error: "parse_failed", raw, reason: parseErr.message };
      }
    }

    return { error: "parse_failed", raw, reason: err.message };
  }
}

export function normalizeStageFailure(stageError) {
  if (!stageError) return null;
  return {
    stage: stageError.stage || "unknown",
    reason: stageError.reason || stageError.message || "stage_failed",
    recoverable: stageError.recoverable !== false,
    suggestedFix: stageError.suggestedFix || "Retry the request with clearer input.",
    details: Array.isArray(stageError.details) ? stageError.details : [],
  };
}

export function buildFailureResult({ errorType, stage, reason, options = {}, payload = {} }) {
  const stageError = createStageError(stage, reason, options);
  const failure = normalizeStageFailure(stageError);
  return {
    success: false,
    errorType,
    message: failure.reason,
    stageError: failure,
    ...payload,
  };
}

export function successStageResult(stage, output, durationMs, warnings = [], errors = [], repairLog = null, metrics = []) {
  return {
    success: true,
    stage,
    output,
    warnings,
    errors,
    repairLog,
    metrics,
    durationMs,
    stopPipeline: false,
  };
}

export function failedStageResult(stage, durationMs, pipelineResult, warnings = [], errors = [], repairLog = null, metrics = []) {
  return {
    success: false,
    stage,
    output: null,
    warnings,
    errors,
    repairLog,
    metrics,
    durationMs,
    stopPipeline: true,
    pipelineResult,
  };
}
