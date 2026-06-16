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
  return `Canonical IR Prompt Builder
Schema Version: ${SCHEMA_VERSION}

Generate a Canonical IR object only. The output must be a single JSON object that matches the schema rules below. Do NOT include markdown, code fences, explanation text, or visualization structures.`;
}

function buildSchemaRules() {
  return `CANONICAL IR SCHEMA RULES:
- Treat the provided chunks as the single source of truth. Do not invent facts, entities, or relationships that cannot be reasonably inferred from the supplied text.
- Output must be EXACTLY one JSON object.
- Top-level fields must include: document, nodes, relations, sequences, comparisons.
- sourceMap is managed by the backend and should NOT be generated.
- sourceRefs must reference the provided chunkId values.
- Do not add any other top-level sections.
- Do not return any mind maps, timelines, flowcharts, tables, diagrams, or any visualization-specific structure.
- Do not return anything other than valid JSON.
- Use the current schema version: ${SCHEMA_VERSION}.

DOCUMENT SECTION:
- document.schemaVersion: must equal ${SCHEMA_VERSION}.
- document.title: string title for the source document.
- document.summary: short high-level summary.
- document.language: ISO 639-1 code (e.g. 'en').
- document.sourceFingerprint: stable source hash.

NODE SECTION:
- nodes must be an array of node objects.
- Required node fields: id, type, label, importance, sourceRefs.
- id: unique node identifier string, e.g. 'n1'.
- type: one of ${listValues(NODE_TYPES)}.
- label: plain text label for the node.
- importance: numeric value between 0.0 and 1.0.
  - 0.0 = least important, 1.0 = most important.
  - Use decimals, not strings.
- sourceRefs: array of objects referencing valid chunk IDs.
  - Each sourceRef must be { "sourceId": "chunk-..." }.
  - sourceId values must exist in the provided sourceMap.
- Optional node fields: summary, time, parentId, groupId.

RELATION SECTION:
- relations must be an array of relation objects.
- Required relation fields: sourceNodeId, targetNodeId.
- relationType: optional, one of ${listValues(RELATION_TYPES)}.
- Each relation connects two existing node ids.

SEQUENCE SECTION:
- sequences must be an array of sequence objects.
- Required sequence fields: id, type, label, nodeIds.
- type should be one of ${listValues(SEQUENCE_TYPES)}.
- nodeIds: ordered array of node ids in the sequence.

COMPARISON SECTION:
- comparisons must be an array of comparison objects.
- Each comparison has id, label, and items.
- items compare node ids using itemId, name, and criteria.
`;
}

function buildSourceChunkDefinitions({ chunks, sourceMap }) {
  return `SOURCE CHUNK DEFINITIONS:
- Use the chunkId values from the chunks below for node sourceRefs.
- Each chunkId must appear in sourceMap.
- Use the text and excerpt to identify ideas, facts, and citations.

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

Example structure:
{
  "document": { "schemaVersion": "${SCHEMA_VERSION}", "title": "...", "summary": "...", "language": "en", "sourceFingerprint": "..." },
    "nodes": [
    {
      "id": "n1",
      "type": "...",
      "label": "...",
      "importance": 0.8,
      "sourceRefs": [
        { "sourceId": "chunk-1" }
      ]
    }
  ],
  "relations": [],
  "sequences": [],
  "comparisons": []
}`;
}

export default function buildCanonicalPrompt({ chunks, sourceMap }) {
  if (!Array.isArray(chunks) || typeof sourceMap !== "object" || sourceMap === null) {
    throw new Error("buildCanonicalPrompt requires { chunks, sourceMap } from chunkText()");
  }

  return [
    buildHeader(),
    buildSchemaRules(),
    buildSourceChunkDefinitions({ chunks, sourceMap }),
    buildJsonContract(),
  ].join("\n\n").trim();
}
