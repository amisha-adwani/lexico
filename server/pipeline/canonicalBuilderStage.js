import buildCanonicalPrompt from "../utils/buildCanonicalPrompt.js";
import aiClient from "../services/aiClient.js";
import {
  nowMs,
  tryParseAiJson,
  buildFailureResult,
  successStageResult,
  failedStageResult,
} from "./stageUtils.js";

function normalizeKey(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function firstSentence(text) {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : trimmed).trim();
}

function buildKnowledgeSummaryIndex(knowledgeModel) {
  const index = new Map();
  if (!knowledgeModel || typeof knowledgeModel !== "object" || Array.isArray(knowledgeModel)) return index;

  const concepts = Array.isArray(knowledgeModel.concepts) ? knowledgeModel.concepts : [];
  for (const concept of concepts) {
    if (!concept || typeof concept !== "object" || Array.isArray(concept)) continue;
    const name =
      concept.name ||
      concept.concept ||
      concept.label ||
      concept.term ||
      "";
    const aliases = Array.isArray(concept.aliases) ? concept.aliases : [];
    const shortDescription =
      concept.shortDescription ||
      concept.description ||
      concept.summary ||
      "";
    const fullDescription =
      concept.fullDescription ||
      concept.details ||
      "";
    const summary = (typeof shortDescription === "string" && shortDescription.trim())
      ? shortDescription.trim()
      : firstSentence(fullDescription);

    const keys = [name, ...aliases]
      .map(normalizeKey)
      .filter(Boolean);

    for (const key of keys) {
      if (!index.has(key) && summary) {
        index.set(key, summary);
      }
    }
  }

  const definitions = Array.isArray(knowledgeModel.definitions) ? knowledgeModel.definitions : [];
  for (const def of definitions) {
    if (!def || typeof def !== "object" || Array.isArray(def)) continue;
    const term = def.term || def.label || "";
    const definition = def.definition || def.description || "";
    const key = normalizeKey(term);
    const summary = firstSentence(definition);
    if (key && summary && !index.has(key)) {
      index.set(key, summary);
    }
  }

  return index;
}

function enrichCanonicalNodeSummaries(canonicalIR, knowledgeModel) {
  if (!canonicalIR || typeof canonicalIR !== "object" || Array.isArray(canonicalIR)) return canonicalIR;
  if (!Array.isArray(canonicalIR.nodes) || canonicalIR.nodes.length === 0) return canonicalIR;

  const summaryIndex = buildKnowledgeSummaryIndex(knowledgeModel);
  if (summaryIndex.size === 0) return canonicalIR;

  canonicalIR.nodes = canonicalIR.nodes.map((node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return node;
    const hasSummary = typeof node.summary === "string" && node.summary.trim();
    if (hasSummary) return node;

    const key = normalizeKey(node.label);
    const summary = key ? summaryIndex.get(key) : "";
    if (!summary) return node;

    return { ...node, summary };
  });

  return canonicalIR;
}

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
      canonicalIR: enrichCanonicalNodeSummaries(parseResult.parsed, context.knowledgeModel),
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

  const existingPipelineResult = firstAttempt.pipelineResult || retryAttempt.pipelineResult;
  if (existingPipelineResult) {
    return failedStageResult("canonicalBuilderStage", nowMs() - stageStart, existingPipelineResult, [], [], null, metrics);
  }

  const failureSource = {
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
