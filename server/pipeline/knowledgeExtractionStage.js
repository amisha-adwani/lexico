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

function buildExtractionRepairPrompt({ originalPrompt, invalidRaw, parseReason }) {
  const safeRaw = typeof invalidRaw === "string" ? invalidRaw.slice(0, 4000) : String(invalidRaw || "");
  const safeReason = typeof parseReason === "string" ? parseReason : "Unable to parse AI JSON response";

  return [
    originalPrompt,
    "",
    "JSON REPAIR",
    "- Your previous response was not valid JSON and could not be parsed.",
    `- Parse error: ${safeReason}`,
    "- Return ONLY a single valid JSON object matching the Knowledge Model schema from the prompt above.",
    "- Do not include markdown, backticks, comments, or any surrounding text.",
    "",
    "PREVIOUS INVALID RESPONSE (for correction):",
    safeRaw,
  ].join("\n");
}

function buildExtractionSchemaRepairPrompt({ originalPrompt, invalidJson, reasons = [] }) {
  const safeJson = typeof invalidJson === "string" ? invalidJson.slice(0, 4000) : String(invalidJson || "");
  const safeReasons = Array.isArray(reasons) ? reasons.filter(Boolean).slice(0, 10) : [];

  return [
    originalPrompt,
    "",
    "SCHEMA REPAIR",
    "- Your previous response was valid JSON but did not match the required Knowledge Model schema.",
    "- Return ONLY a single valid JSON object that includes ALL required top-level fields and domain arrays.",
    ...(safeReasons.length ? ["", "Missing/invalid fields:", ...safeReasons.map((r) => `- ${r}`)] : []),
    "",
    "PREVIOUS JSON (for correction):",
    safeJson,
  ].join("\n");
}

function ensureString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp01(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeEvidenceFields(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;

  const evidenceRefs = Array.isArray(item.evidenceRefs)
    ? item.evidenceRefs.filter((ref) => typeof ref === "string" && ref.trim())
    : [];
  const evidenceType = ["source_backed", "inferred"].includes(item.evidenceType)
    ? item.evidenceType
    : (evidenceRefs.length > 0 ? "source_backed" : "inferred");
  const confidence = clamp01(item.confidence);

  return {
    ...item,
    evidenceRefs,
    evidenceType,
    confidence,
  };
}

function normalizeKnowledgeModelEvidence(model) {
  if (!model || typeof model !== "object" || Array.isArray(model)) return model;

  const domainNames = [
    "concepts",
    "definitions",
    "prerequisiteRelations",
    "examples",
    "workflows",
    "comparisons",
    "timelines",
    "formulas",
    "misconceptions",
    "interviewInsights",
    "applications",
    "aliases",
  ];

  for (const domain of domainNames) {
    if (Array.isArray(model[domain])) {
      model[domain] = model[domain].map(normalizeEvidenceFields);
    }
  }

  return model;
}

function applyKnowledgeModelDefaults(model, request = {}) {
  const result = ensureObject(model);

  if (!result.knowledgeModelVersion) {
    result.knowledgeModelVersion = KNOWLEDGE_MODEL_VERSION;
  }

  result.documentMetadata = ensureObject(result.documentMetadata);
  result.documentMetadata.title = ensureString(result.documentMetadata.title, "") || ensureString(request.documentTitle, "Untitled");
  result.documentMetadata.language = ensureString(result.documentMetadata.language, "en") || "en";
  result.documentMetadata.sourceFingerprint =
    ensureString(result.documentMetadata.sourceFingerprint, "") || ensureString(request.sourceFingerprint, "");

  const domainNames = [
    "concepts",
    "definitions",
    "prerequisiteRelations",
    "examples",
    "workflows",
    "comparisons",
    "timelines",
    "formulas",
    "misconceptions",
    "interviewInsights",
    "applications",
    "aliases",
  ];

  for (const domain of domainNames) {
    result[domain] = ensureArray(result[domain]);
  }

  result.quality = ensureObject(result.quality);
  result.quality.coverage = ensureObject(result.quality.coverage);
  result.quality.coverage.score = typeof result.quality.coverage.score === "number" ? clamp01(result.quality.coverage.score) : 0;
  result.quality.coverage.gaps = ensureArray(result.quality.coverage.gaps);
  result.quality.coverage.notes = ensureString(result.quality.coverage.notes, "");

  result.quality.ambiguity = ensureObject(result.quality.ambiguity);
  result.quality.ambiguity.score = typeof result.quality.ambiguity.score === "number" ? clamp01(result.quality.ambiguity.score) : 0;
  result.quality.ambiguity.issues = ensureArray(result.quality.ambiguity.issues);
  result.quality.ambiguity.notes = ensureString(result.quality.ambiguity.notes, "");

  result.quality.consistency = ensureObject(result.quality.consistency);
  result.quality.consistency.score = typeof result.quality.consistency.score === "number" ? clamp01(result.quality.consistency.score) : 0;
  result.quality.consistency.conflicts = ensureArray(result.quality.consistency.conflicts);
  result.quality.consistency.notes = ensureString(result.quality.consistency.notes, "");

  result.quality.confidence = ensureObject(result.quality.confidence);
  result.quality.confidence.overall =
    typeof result.quality.confidence.overall === "number" ? clamp01(result.quality.confidence.overall) : 0;
  result.quality.confidence.byDomain = ensureObject(result.quality.confidence.byDomain);

  result.quality.learningValue = ensureObject(result.quality.learningValue);
  result.quality.learningValue.score =
    typeof result.quality.learningValue.score === "number" ? clamp01(result.quality.learningValue.score) : 0;
  result.quality.learningValue.reasoning = ensureString(result.quality.learningValue.reasoning, "");

  result.extractionNotes = ensureString(result.extractionNotes, "");

  return result;
}

function evaluateKnowledgeModelCompleteness(model) {
  const reasons = [];
  const value = ensureObject(model);

  if (!value.knowledgeModelVersion) reasons.push("knowledgeModelVersion missing");
  if (!value.documentMetadata || typeof value.documentMetadata !== "object") reasons.push("documentMetadata missing");
  if (!value.quality || typeof value.quality !== "object") reasons.push("quality missing");

  const domainNames = [
    "concepts",
    "definitions",
    "prerequisiteRelations",
    "examples",
    "workflows",
    "comparisons",
    "timelines",
    "formulas",
    "misconceptions",
    "interviewInsights",
    "applications",
    "aliases",
  ];

  const missingDomains = domainNames.filter((domain) => !(domain in value));
  if (missingDomains.length > 6) {
    reasons.push(`domains missing (${missingDomains.length}/${domainNames.length})`);
  }

  const estimatedSize = JSON.stringify(value).length;
  if (estimatedSize < 400) {
    reasons.push("response too small to be a full knowledge model");
  }

  return { ok: reasons.length === 0, reasons };
}

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

  const attemptGenerationAndParse = async (attemptNumber, prompt) => {
    let raw;
    try {
      const aiStart = nowMs();
      raw = await aiClient.generateContent(prompt);
      metrics.push({
        stage: attemptNumber === 1 ? "knowledge_extractor" : `knowledge_extractor_attempt_${attemptNumber}`,
        durationMs: nowMs() - aiStart,
        inputSize: prompt?.length || 0,
        outputSize: raw?.length || 0,
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
        payload: { raw },
      });
      return { success: false, pipelineResult, raw };
    }

    const parseStart = nowMs();
    const parseResult = await tryParseAiJson(raw);
    metrics.push({
      stage: attemptNumber === 1 ? "knowledge_model_parse" : `knowledge_model_parse_attempt_${attemptNumber}`,
      durationMs: nowMs() - parseStart,
      inputSize: raw?.length || 0,
      outputSize: parseResult?.parsed ? JSON.stringify(parseResult.parsed).length : 0,
      warnings: parseResult.error ? [parseResult.reason || parseResult.error] : [],
      validationResult: parseResult.error ? "failed" : "ok",
    });

    if (parseResult.error) {
      return { success: false, parseResult, raw };
    }

    return { success: true, parseResult, raw };
  };

  const firstAttempt = await attemptGenerationAndParse(1, extractionPrompt);
  if (firstAttempt.success) {
    extractionRaw = firstAttempt.raw;
  } else {
    const repairPrompt = buildExtractionRepairPrompt({
      originalPrompt: extractionPrompt,
      invalidRaw: firstAttempt.raw,
      parseReason: firstAttempt.parseResult?.reason || firstAttempt.parseResult?.error,
    });
    const secondAttempt = await attemptGenerationAndParse(2, repairPrompt);

    if (!secondAttempt.success) {
      const existingPipelineResult = firstAttempt.pipelineResult || secondAttempt.pipelineResult;
      if (existingPipelineResult) {
        return failedStageResult("knowledgeExtractionStage", nowMs() - stageStart, existingPipelineResult, [], [], null, metrics);
      }

      const failureSource = {
        errorType: firstAttempt.parseResult?.error || secondAttempt.parseResult?.error || "parse_failed",
        stage: "Knowledge Model Parse",
        reason: "Invalid JSON response",
        options: {
          recoverable: true,
          suggestedFix: "Retry so model returns valid JSON only.",
          details: [(firstAttempt.parseResult?.reason || secondAttempt.parseResult?.reason || "Unable to parse AI JSON response")],
          statusCode: 422,
        },
        payload: { raw: secondAttempt.raw || firstAttempt.raw },
      };

      const pipelineResult = buildFailureResult({
        errorType: failureSource.errorType,
        stage: failureSource.stage,
        reason: failureSource.reason,
        options: failureSource.options,
        payload: failureSource.payload,
      });

      return failedStageResult("knowledgeExtractionStage", nowMs() - stageStart, pipelineResult, [], [], null, metrics);
    }

    extractionRaw = secondAttempt.raw;
    // Stash parsed so we don't parse twice.
    firstAttempt.parseResult = secondAttempt.parseResult;
  }

  let extractionResult = firstAttempt.parseResult || (await tryParseAiJson(extractionRaw));

  if (extractionResult?.parsed && typeof extractionResult.parsed === "object") {
    const completeness = evaluateKnowledgeModelCompleteness(extractionResult.parsed);
    if (!completeness.ok) {
      const repairPrompt = buildExtractionSchemaRepairPrompt({
        originalPrompt: extractionPrompt,
        invalidJson: JSON.stringify(extractionResult.parsed, null, 2),
        reasons: completeness.reasons,
      });

      const schemaAttempt = await attemptGenerationAndParse(2, repairPrompt);
      if (schemaAttempt.success) {
        extractionRaw = schemaAttempt.raw;
        extractionResult = schemaAttempt.parseResult;
      }
    }
  }

  const knowledgeModel = applyKnowledgeModelDefaults(
    normalizeKnowledgeModelEvidence(extractionResult.parsed),
    context.request
  );
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
