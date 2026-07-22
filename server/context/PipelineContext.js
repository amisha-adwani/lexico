/**
 * Pipeline Execution Context
 *
 * Carries state through the pipeline stages in a single immutable object.
 * Each stage reads from the context and contributes new fields via successStageResult().
 *
 * FIELD ORGANIZATION:
 * - Request: Original user input
 * - Chunking Outputs: Deterministic transformation of input
 * - Knowledge Extraction (Phase 1): Primary AI reasoning stage output
 * - Legacy Analysis (Phase 1 transition): Compatibility layer only
 * - Educational Planning (Phase 2 - future): Pedagogical intent
 * - Graph Construction: Deterministic graph building
 * - Validation & Optimization: Schema correctness and structure refinement
 * - Execution Metadata: Diagnostics, metrics, and observability
 *
 * CANONICAL FLOW:
 * Input → Chunking → Knowledge Extraction → [Educational Planner] → Graph Builder → [Validation/Optimization] → Output
 *
 * STABILITY GUARANTEES:
 * - Request fields never change after initialization
 * - Each stage produces immutable output
 * - Downstream stages read only previous stage outputs
 * - No backward mutation of context fields
 */

export function createPipelineContext(request = {}) {
  return {
    // ============================================================================
    // REQUEST: Original user input (immutable throughout pipeline)
    // ============================================================================
    request: {
      text: request.text || "",
      documentTitle: request.documentTitle,
      sourceFingerprint: request.sourceFingerprint,
      language: request.language,
    },

    // ============================================================================
    // CHUNKING OUTPUTS: Deterministic text normalization (chunkStage)
    // ============================================================================
    chunks: [],
    sourceMap: {},

    // ============================================================================
    // KNOWLEDGE EXTRACTION OUTPUTS: Primary AI reasoning stage (Phase 1 - STABLE)
    // ============================================================================
    // The Knowledge Model is the primary artifact produced by the first AI stage.
    // It contains all educational knowledge discovered from the input.
    // This is the canonical handoff to downstream stages.
    knowledgeModel: null,
    // Internal parsing artifacts (not for direct consumption)
    extractionRaw: undefined,
    extractionParsed: null,

    // ============================================================================
    // LEGACY ANALYSIS OUTPUTS: Backward compatibility layer (Phase 1 transition)
    // ============================================================================
    // DEPRECATED: Knowledge Extraction is now the authoritative reasoning stage.
    // These fields exist only for downstream compatibility during Phase 1.
    // They will be fully removed when Educational Planner (Phase 2) replaces this.
    // NEW CODE should use knowledgeModel instead of analysisParsed.
    analysisRaw: undefined,
    analysisParsed: null,

    // ============================================================================
    // EDUCATIONAL PLANNING OUTPUTS: Pedagogical intent (Phase 2 - future)
    // ============================================================================
    // To be populated by Educational Planner in Phase 2.
    // Will define learning hierarchy, ordering, and coverage intent.
    semanticBlueprint: null,    educationalBlueprint: null,
    educationalPlannerRaw: undefined,
    // ============================================================================
    // GRAPH CONSTRUCTION OUTPUTS: Deterministic IR building (canonicalBuilderStage)
    // ============================================================================
    canonicalRaw: undefined,
    canonicalParsed: null,
    canonicalIR: null,

    // ============================================================================
    // VALIDATION & OPTIMIZATION OUTPUTS: Quality and structure refinement
    // ============================================================================
    canonicalValidation: null,
    executionValidation: null,

    // ============================================================================
    // EXECUTION METADATA: Diagnostics, quality, and observability
    // ============================================================================
    warnings: [],
    repairLog: null,
    diagnostics: [],
    metrics: [],
    stageHistory: [],
    result: null,
  };
}

export default createPipelineContext;
