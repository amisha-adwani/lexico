function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildHeader() {
  return `You are a knowledge extraction assistant.

Your task is to analyze the supplied source chunks and produce a structured Knowledge Model for downstream educational planning.

CRITICAL: YOU ARE NOT BUILDING A GRAPH.
You are not creating canonical IDs, graph nodes, relations, renderer data, or visualization models.
You are extracting educational knowledge into a schema-ready Knowledge Model.

Prioritize educational usefulness, clarity, and evidence-backed content over raw volume.

Return exactly one valid JSON object.`;
}

function buildExtractionInstructions() {
  return `
KNOWLEDGE EXTRACTION TASK
Use the supplied chunks and source map as the only evidence source.
Extract educationally relevant knowledge that can support a downstream learning plan.

Return a JSON object that matches the Knowledge Model schema with the following high-level structure:
{
  "knowledgeModelVersion": "1.0.0",
  "documentMetadata": {
    "title": "",
    "language": "en",
    "sourceFingerprint": ""
  },
  "concepts": [],
  "definitions": [],
  "prerequisiteRelations": [],
  "examples": [],
  "workflows": [],
  "comparisons": [],
  "timelines": [],
  "formulas": [],
  "misconceptions": [],
  "interviewInsights": [],
  "applications": [],
  "aliases": [],
  "quality": {
    "coverage": { "score": 0.0, "gaps": [], "notes": "" },
    "ambiguity": { "score": 0.0, "issues": [], "notes": "" },
    "consistency": { "score": 0.0, "conflicts": [], "notes": "" },
    "confidence": { "overall": 0.0, "byDomain": {} },
    "learningValue": { "score": 0.0, "reasoning": "" }
  },
  "extractionNotes": ""
}

EXTRACTION RULES
- Base every field on the provided chunks only.
- Do not invent concepts, definitions, or relationships that are not evidenced by the source.
- Prefer concise, factual, educationally useful content.
- Use empty arrays or empty strings when a field is not applicable.
- Preserve traceability when possible by grounding concepts in the supplied source material.
- Every extracted item should include evidenceRefs, evidenceType, and confidence metadata where appropriate.
- Set evidenceType to either "source_backed" or "inferred".
- Set confidence to a number between 0 and 1.
- The output must be directly parseable JSON with no markdown fences or surrounding prose.
- Never create graph ids, renderer data, canonical ids, or visualization structures.
- Do not include educational planning, prerequisite ordering, or visualization recommendations.
`;
}

function buildChunkDefinitions({ chunks, sourceMap, documentMetadata }) {
  return `SOURCE CHUNKS
${formatJson(chunks)}

SOURCE MAP
${formatJson(sourceMap)}

DOCUMENT METADATA
${formatJson(documentMetadata)}`;
}

function buildJsonContract() {
  return `JSON CONTRACT
- Return only a single JSON object.
- Do not wrap the JSON in markdown fences or prose.
- The object must include the fields shown in the schema above.
- The object must be suitable for validation by the Knowledge Model schema.`;
}

export default function buildKnowledgeExtractionPrompt({ chunks, sourceMap, documentMetadata }) {
  if (!Array.isArray(chunks)) {
    throw new Error('buildKnowledgeExtractionPrompt requires { chunks }');
  }

  return [
    buildHeader(),
    buildExtractionInstructions(),
    buildChunkDefinitions({ chunks, sourceMap, documentMetadata }),
    buildJsonContract(),
  ].join('\n\n');
}
