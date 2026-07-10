function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildHeader() {
  return `You are an educational planning assistant.

Your task is to transform the supplied Knowledge Model into an Educational Blueprint.

CRITICAL: YOU ARE NOT EXTRACTING KNOWLEDGE.
You are not rewriting, expanding, or restructuring the source content.
You are only planning how the knowledge should be learned.

You must only:
- determine learning order
- identify prerequisite progression
- recommend educational emphasis
- identify optional topics
- recommend visualization types
- estimate learning difficulty

You must never:
- invent concepts
- modify extracted knowledge
- generate graph ids
- create renderer data
- create canonical ids
- create graph nodes or edges
- add new knowledge that is not supported by the supplied Knowledge Model`;
}

function buildPlanningInstructions() {
  return `
EDUCATIONAL PLANNING TASK
Use the supplied Knowledge Model as the only evidence source.
Infer a learning pathway that is pedagogically coherent and grounded in the model's existing concepts and relationships.

Return exactly one valid JSON object conforming to the Educational Blueprint schema.
REQUIRED OUTPUT SHAPE
{
  "blueprintVersion": "${process.env.EDUCATIONAL_BLUEPRINT_VERSION}",
  "documentIntent": {
    "topic": "",
    "audience": "",
    "context": "",
    "purpose": ""
  },
  "learningGoal": "",
  "entryConcepts": [
    {
      "concept": "",
      "rationale": ""
    }
  ],
  "learningSequence": [
    {
      "order": 1,
      "label": "",
      "conceptsInvolved": [],
      "rationale": ""
    }
  ],
  "prerequisiteChains": [
    {
      "concept": "",
      "prerequisites": []
    }
  ],
  "visualizationPlan": {
    "approach": "",
    "notes": ""
  },
  "emphasisAreas": [],
  "optionalTopics": [],
  "estimatedDifficulty": "",
  "pedagogyNotes": [],
  "quality": {
    "clarity": 0.0,
    "coverage": 0.0,
    "coherence": 0.0,
    "notes": ""
  },
  "timestamp": ""
}

PLANNING RULES
- Base every field on the provided Knowledge Model only.
- Do not introduce concepts not supported by the model.
- - Every concept referenced in learningSequence, entryConcepts, prerequisiteChains, emphasisAreas and optionalTopics must already exist in the Knowledge Model.
- Preserve the model's existing meaning and scope.
- Prefer a simple, coherent progression from foundational ideas to more advanced ones.
- Use concise, factual language.
- If a field is not applicable, use an empty array or empty string rather than inventing content.
- The output must be directly parseable JSON with no markdown fences or surrounding prose.
- Never include graph ids, renderer data, canonical ids, or other non-educational artifacts.
- Never create a visualization model or graph structure that is not an educational recommendation.
`;
}

function buildKnowledgeModelInput({ knowledgeModel }) {
  return `KNOWLEDGE MODEL
${formatJson(knowledgeModel)}`;
}

function buildJsonContract() {
  return `JSON CONTRACT
- Return only a single JSON object.
- Do not wrap the JSON in markdown fences or prose.
- The object must include the fields shown in the schema above.
- The object must exactly match the Educational Blueprint schema.`;
}

export default function buildEducationalPlannerPrompt({ knowledgeModel }) {
  if (!knowledgeModel || typeof knowledgeModel !== 'object') {
    throw new Error('buildEducationalPlannerPrompt requires { knowledgeModel }');
  }

  return [
    buildHeader(),
    buildPlanningInstructions(),
    buildKnowledgeModelInput({ knowledgeModel }),
    buildJsonContract(),
  ].join('\n\n');
}
