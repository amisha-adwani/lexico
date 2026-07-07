import {
  SCHEMA_VERSION,
  NODE_TYPES,
  RELATION_TYPES,
  SEQUENCE_TYPES,
} from "./canonicalSchema.js";

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function listValues(values) {
  return Object.values(values).join(", ");
}

function buildHeader() {
  return `You are an expert Canonical IR builder.

You have already been given the document analysis produced by a previous AI.
Assume that analysis is correct.
Your only responsibility is to construct Canonical IR from the semantic blueprint and chunk evidence.

Return ONLY valid JSON.`;
}

function buildBuilderInstructions() {
  return `
CANONICAL IR BUILDING TASK
You are not re-analyzing the document.
The semantic blueprint is the primary source of truth for what graph to build.
Use chunk text only for evidence, node summaries, sourceRefs, and missing details.
Infer structure only when the semantic blueprint is missing a specific field.
If chunk evidence and blueprint intent appear to conflict, preserve blueprint structure and use chunks for factual wording.

SEMANTIC BLUEPRINT EXECUTION ORDER
Follow this order exactly and do not skip ahead:
1) Hierarchy first: topologyPlan.plannedHierarchy
- Traverse plannedHierarchy recursively.
- Generate parentId directly from this tree and preserve nesting.
- Only infer hierarchy when topologyPlan.plannedHierarchy is missing or empty.

2) Workflows second: artifactPlans.workflows
- Build workflow/process sequences from artifactPlans.workflows.
- Preserve step order exactly.
- Create decision nodes when decisionPoints are provided.
- Create branch nodes/sequences when branches are provided.
- Do not rediscover workflows from chunks if workflow plans exist.

3) Comparisons third: artifactPlans.comparisons
- Build comparison objects from artifactPlans.comparisons.
- Ensure compared items are linked with relationType "compared_to".
- Preserve provided criteria; infer missing criterion values only when necessary.

4) Timelines fourth: artifactPlans.timelines
- Build timeline sequences from artifactPlans.timelines.
- Preserve event ordering from the plan.
- Populate node time from provided timeline event time values.
- Only infer timeline information when timeline plans are missing.

5) Relations and density fifth: topologyPlan.graphDensity
- sparse: generate only essential relations (hierarchy, required process/timeline links, explicit comparisons/crossReferences).
- medium: generate balanced essential + selective semantic support links.
- dense: generate richer semantic cross-links across clusters/sections/concepts.

6) Clusters and grouping sixth: topologyPlan.clusters
- Use clusters to create semantic category/group nodes when appropriate.
- Use parentId to avoid flat structures.
- Use groupId when helpful for coherent grouping.

7) Duplicates last: artifactPlans.duplicates
- Merge duplicates listed in artifactPlans.duplicates into one canonical node.
- Reuse the canonical node across hierarchy, relations, sequences, and comparisons.
- Merge sourceRefs and merge summaries when compatible.

8) Compatibility fallback
- If legacy fields appear (plannedHierarchy, workflowPlans, comparisonPlans, timelinePlans, duplicateGroups, graphPlan), map them to the nearest equivalent and continue.

Determinism rules
- Do not rediscover document type, hierarchy, workflow intent, comparison intent, or graph shape when those are already present in the semantic blueprint.
- Preserve the provided ordering from the blueprint.
- Reuse existing node labels when the same concept appears under a different label instead of creating duplicates.
- Do not create additional workflow/comparison/timeline artifacts beyond those in artifactPlans unless artifactPlans is empty.
- Ensure hierarchy links are finalized before generating relations, sequences, and comparisons.
- Emit a stable, consistent structure for identical inputs.`;
}

function buildSchemaRules() {
  return `CANONICAL IR SCHEMA RULES:
- Treat the provided chunks as the single source of truth. Do not invent facts, entities, or relationships that cannot be reasonably inferred from the supplied text.
- Output must be EXACTLY one JSON object with top-level fields: document, nodes, relations, sequences, comparisons. No other top-level sections, and no visualization-specific structures.
- sourceMap is managed by the backend and should NOT be generated.
- sourceRefs must reference the provided chunkId values.
- Use the current schema version: ${SCHEMA_VERSION}.

DOCUMENT SECTION:
- document.schemaVersion: must equal ${SCHEMA_VERSION}.
- document.title: string title for the source document.
- document.summary: short high-level summary.
- document.language: ISO 639-1 code (e.g. 'en').
- document.sourceFingerprint: stable source hash.

NODE SECTION:
- nodes must be an array of node objects.
- Required fields: id, type, label, importance, sourceRefs.
- id: unique string, e.g. 'n1'. type: one of ${listValues(NODE_TYPES)}. label: plain text.
- importance: 0.0-1.0, decimal, reflecting structural role.
- sourceRefs: array of { "sourceId": "chunk-..." }, must exist in sourceMap.
- Optional fields: summary, time, parentId, groupId.
- parentId is REQUIRED for any sub-concept, sub-step, category member, definition, example, warning, tip, or note.
- Reuse an existing node when the same concept appears under a different label instead of creating duplicates.

RELATION SECTION:
- relations must be an array of objects with required fields: id, sourceNodeId, targetNodeId; relationType optional, one of ${listValues(RELATION_TYPES)}.
- Use "compared_to" for comparisons.
- Relation count and richness must follow topologyPlan.graphDensity.
- Encode prerequisite language as relationType "requires".

SEQUENCE SECTION:
- sequences must be an array of objects with required fields: id, type, label, nodeIds (ordered). type: one of ${listValues(SEQUENCE_TYPES)}.
- Build sequences from artifactPlans.workflows and artifactPlans.timelines when present.

COMPARISON SECTION:
- comparisons must be generated from artifactPlans.comparisons when present.
- Every comparison item must also be connected via "compared_to" relations.
`;
}

function buildDocumentAnalysisSection({ documentAnalysis }) {
  return `DOCUMENT ANALYSIS
${formatJson(documentAnalysis)}`;
}

function buildSourceChunkDefinitions({ chunks, sourceMap }) {
  return `SOURCE CHUNK DEFINITIONS:
- Use the chunkId values from the chunks below for node sourceRefs.
- Each chunkId must appear in sourceMap.

Chunks:
${formatJson(chunks)}

Source map:
${formatJson(sourceMap)}`;
}

function buildJsonContract() {
  return `JSON OUTPUT CONTRACT:
- Return only valid JSON.
- Do not include markdown, tables, backticks, comments, or explanatory text.
- Do not wrap the JSON in quotes or any other container.
- If a field is not applicable, use an empty array or object, not null.
- Ensure every top-level section is present, even if empty.
`;
}

export default function buildCanonicalPrompt({ chunks, sourceMap, documentAnalysis }) {
  if (!Array.isArray(chunks) || typeof sourceMap !== "object" || sourceMap === null) {
    throw new Error("buildCanonicalPrompt requires { chunks, sourceMap } from chunkText()");
  }

  if (!documentAnalysis || typeof documentAnalysis !== "object") {
    throw new Error("buildCanonicalPrompt requires documentAnalysis from buildDocumentAnalysisPrompt()");
  }

  return [
    buildHeader(),
    buildBuilderInstructions(),
    buildSchemaRules(),
    buildDocumentAnalysisSection({ documentAnalysis }),
    buildSourceChunkDefinitions({ chunks, sourceMap }),
    buildJsonContract(),
  ].join("\n\n");
}
