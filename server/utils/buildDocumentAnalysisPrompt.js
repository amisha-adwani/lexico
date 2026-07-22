







import { SCHEMA_VERSION } from "./canonicalSchema.js";

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildHeader() {
  return `You are an expert document analyst.

Your task is to understand the supplied document chunks and produce structured analysis for a downstream Canonical IR builder.

Do NOT generate nodes, relations, ids, Canonical IR, or visualization data.
Do NOT summarize the document in prose.

Return ONLY valid JSON.`;
}


function buildAnalysisInstructions() {
  return `
DOCUMENT PLANNING TASK
Analyze the supplied chunks and produce a concise semantic blueprint for the downstream Canonical Builder.
The blueprint should capture meaning, structure, and expected graph shape without generating Canonical IR.

OUTPUT SCHEMA
{
  "documentIntent": {
    "types": ["tutorial"],
    "organization": ["hierarchical", "procedural"],
    "mainTopic": "..."
  },
  "documentType": ["tutorial"],
  "organization": ["hierarchical", "procedural"],
  "mainTopic": "...",
  "graphPlan": {
    "rootConcepts": [],
    "majorSections": [],
    "clusters": [],
    "workflowGroups": [],
    "comparisonGroups": [],
    "timelineGroups": [],
    "crossLinks": [],
    "graphDensity": "medium"
  },
  "coreConcepts": [],
  "topologyPlan": {
    "plannedHierarchy": [
      {
        "label": "Programming",
        "children": [
          { "label": "JavaScript", "children": [{ "label": "Closures" }] }
        ]
      }
    ],
    "clusters": [],
    "crossLinks": [],
    "graphDensity": "medium"
  },
  "artifactPlans": {
    "workflows": [
      { "name": "Deployment", "steps": ["Build", "Test", "Deploy"], "decisionPoints": ["Tests Pass?"], "branches": ["Rollback"] }
    ],
    "comparisons": [
      { "name": "REST vs GraphQL", "items": ["REST", "GraphQL"], "criteria": ["Performance", "Caching", "Flexibility"] }
    ],
    "timelines": [
      { "name": "React Evolution", "events": [{ "label": "React 16", "time": "2017" }] }
    ],
    "duplicates": [
      { "canonical": "Promise", "duplicates": ["Promises", "Promise Object"] }
    ]
  },
  "qualitySignals": {
    "planningConfidence": 0.95,
    "ambiguities": []
  },
  "planningConfidence": 0.95,
  "generationHints": {
    "expectedDepth": 4,
    "expectedNodeCount": "25-40",
    "preferCrossLinks": true,
    "preferDeepHierarchy": true,
    "preferWorkflowSequences": true,
    "mergeDuplicateConcepts": true
  }
}

PLANNING RULES
- Return ONLY JSON.
- Use empty arrays or objects when a field is not applicable.
- Keep arrays concise, factual, and evidence-based.
- Choose the most likely interpretation if evidence is limited and lower confidence accordingly.
- Use the provided chunks as the only evidence source.
- NEVER generate Canonical ids, relations, sequences, hierarchy links, or visualization models.
- Keep one source of truth for each planning artifact; place section, cluster, and grouping details in topologyPlan when they describe the same structure.
- The semantic blueprint must be sufficient for the Builder to construct the graph without re-infering structure.
- Prefer deterministic structure and preserve provided ordering.
- Include both graphPlan and topologyPlan-style structure when helpful for downstream compatibility.
- Include coreConcepts as a concise, evidence-based list of the core ideas.
`;
}

function buildChunkDefinitions({ chunks }) {
  return `SOURCE CHUNKS
${formatJson(chunks)}`;
}

function buildJsonContract() {
  return `JSON CONTRACT
- Return only a single JSON object.
- Do not wrap the JSON in markdown fences or prose.
- The object must include the fields shown in the schema above.
- Current schema version: ${SCHEMA_VERSION}`;
}

export default function buildDocumentAnalysisPrompt({ chunks }) {
  if (!Array.isArray(chunks)) {
    throw new Error("buildDocumentAnalysisPrompt requires { chunks } from chunkText()");
  }

  return [
    buildHeader(),
    buildAnalysisInstructions(),
    buildChunkDefinitions({ chunks }),
    buildJsonContract(),
  ].join("\n\n");
}
