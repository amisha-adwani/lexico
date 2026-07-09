import { logStageEvent } from "../utils/logging.js";
import createPipelineContext from "../context/PipelineContext.js";
import chunkStage from "./chunkStage.js";
import knowledgeExtractionStage from "./knowledgeExtractionStage.js";
import analysisStage from "./analysisStage.js";
import blueprintValidationStage from "./blueprintValidationStage.js";
import canonicalBuilderStage from "./canonicalBuilderStage.js";
import canonicalValidationStage from "./canonicalValidationStage.js";
import executionValidationStage from "./executionValidationStage.js";

/**
 * PIPELINE STAGE ORDERING (Frozen Architecture - Phase 1)
 *
 * Current Phase 1:
 *   Chunking → Knowledge Extraction → Analysis (legacy/compat) → Blueprint Validation → [Graph Building]
 *
 * Planned Phase 2:
 *   Chunking → Knowledge Extraction → Educational Planner → [Graph Building]
 *   (Analysis stage will be removed)
 *
 * NOTE: analysisStage is required for backward compatibility because blueprintValidationStage
 * still consumes analysisParsed. It will be fully deprecated in Phase 2 when Educational Planner replaces it.
 *
 * Knowledge Extraction is the authoritative first AI reasoning stage producing knowledgeModel.
 * Do NOT add new features to analysisStage; direct new work to Knowledge Extraction or Educational Planner.
 */
const STAGES = [
  chunkStage,
  knowledgeExtractionStage, // Primary AI reasoning (frozen, stable)
  analysisStage, // Legacy compat (required by blueprintValidationStage, deprecated Phase 2)
  blueprintValidationStage,
  canonicalBuilderStage,
  canonicalValidationStage,
  executionValidationStage,
];

function mergeStageOutput(context, stageResult) {
  if (!stageResult?.output || typeof stageResult.output !== "object") {
    return;
  }
  Object.assign(context, stageResult.output);
}

function emitMetrics(stageResult) {
  const metricEvents = Array.isArray(stageResult?.metrics) ? stageResult.metrics : [];
  for (const metric of metricEvents) {
    if (!metric || typeof metric !== "object") continue;
    const { stage, ...payload } = metric;
    logStageEvent(stage, payload);
  }
}

export async function run(request = {}) {
  const context = createPipelineContext(request);

  for (const stage of STAGES) {
    const stageResult = await stage(context);
    context.stageHistory.push({
      stage: stageResult.stage,
      success: stageResult.success,
      durationMs: stageResult.durationMs,
    });
    context.metrics.push(...(Array.isArray(stageResult.metrics) ? stageResult.metrics : []));

    emitMetrics(stageResult);
    mergeStageOutput(context, stageResult);

    if (!stageResult.success || stageResult.stopPipeline) {
      return stageResult.pipelineResult || context.result;
    }
  }

  return context.result;
}

export default {
  run,
};
