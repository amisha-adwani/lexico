/**
 * KNOWLEDGE MODEL SCHEMA & CONTRACT
 *
 * STATUS: Canonical contract (Phase 1 - FROZEN)
 *
 * This schema defines the structure and validation for the Knowledge Model,
 * the PRIMARY artifact produced by the Knowledge Extraction stage.
 *
 * The Knowledge Model contains all educational knowledge discovered from the input,
 * tagged with evidence references, support type, and confidence scores.
 *
 * SCOPE:
 * Includes:
 * - 12 knowledge domains (concepts, definitions, prerequisites, examples, workflows, etc.)
 * - Evidence traceability (every item references its source chunks)
 * - Confidence transparency (every item has a support type and confidence score)
 * - Quality assessment (coverage, ambiguity, consistency, learning value)
 *
 * Excludes:
 * - Canonical IDs or graph structure
 * - Planning intent or pedagogy
 * - Validation decisions or schema repair
 * - Renderer data or visualization concerns
 *
 * DOWNSTREAM CONSUMPTION:
 * - Phase 1: Educational Planner consumes this in Phase 2
 * - Graph Builder receives Knowledge Model indirectly via Educational Blueprint
 * - All validation and presentation stages read from Knowledge Model
 *
 * STABILITY:
 * This contract is frozen. Extensions are additive only.
 * New domains can be added without breaking existing code.
 */

export const KNOWLEDGE_MODEL_VERSION = "1.0.0";

/**
 * Complete Knowledge Model structure
 * This is the canonical contract produced by Knowledge Extraction stage.
 * All downstream stages consume this artifact.
 */
export const KnowledgeModelSchema = {
  knowledgeModelVersion: KNOWLEDGE_MODEL_VERSION,
  documentMetadata: {
    title: "",
    language: "en",
    sourceFingerprint: "",
  },
  concepts: [
    {
      name: "", // e.g., "Promise"
      shortDescription: "", // one-line definition
      fullDescription: "", // detailed explanation
      aliases: [], // e.g., ["Promises", "Promise Object"]
      category: "", // e.g., "asynchronous-pattern", "design-pattern"
      
    },
  ],
  definitions: [
    {
      term: "",
      definition: "",
      conceptRef: "", // reference to related concept name
      domain: "", // e.g., "terminology", "jargon"
      
    },
  ],
  prerequisiteRelations: [
    {
      concept: "", // e.g., "async/await"
      prerequisite: "", // e.g., "Promise"
      reason: "", // why this is a prerequisite
      optional: false,
      
    },
  ],
  examples: [
    {
      title: "",
      description: "",
      conceptRef: "", // which concept this exemplifies
      exampleCode: "", // if applicable
      context: "", // when this example is useful
      
    },
  ],
  workflows: [
    {
      name: "",
      description: "",
      steps: [
        {
          order: 1,
          label: "",
          description: "",
        },
      ],
      decisionPoints: [], // places where choices arise
      branches: [], // alternate paths or edge cases
      conceptsInvolved: [], // which concepts this workflow uses
      
    },
  ],
  comparisons: [
    {
      name: "",
      description: "",
      items: [], // e.g., ["REST", "GraphQL"]
      criteria: [], // e.g., ["Performance", "Caching"]
      conceptsInvolved: [],
      
    },
  ],
  timelines: [
    {
      name: "",
      description: "",
      events: [
        {
          label: "",
          time: "",
          description: "",
        },
      ],
      conceptsInvolved: [],
      
    },
  ],
  formulas: [
    {
      name: "",
      formula: "", // the actual formula or equation
      explanation: "",
      variables: [
        {
          symbol: "",
          meaning: "",
        },
      ],
      application: "", // when/how to use
      conceptsInvolved: [],
      
    },
  ],
  misconceptions: [
    {
      misconception: "",
      truth: "",
      reason: "", // why this misconception occurs
      pedagogicalNote: "", // how to address it in teaching
      conceptsInvolved: [],
      
    },
  ],
  interviewInsights: [
    {
      insight: "",
      source: "", // e.g., "expert-guidance", "research-finding"
      applicableConcepts: [],
      pedagogicalValue: "", // why this matters for teaching
      
    },
  ],
  applications: [
    {
      title: "",
      description: "",
      domain: "", // e.g., "web-development", "data-science"
      conceptsInvolved: [],
      realWorldContext: "",
      
    },
  ],
  aliases: [
    {
      canonical: "", // the primary term
      aliases: [], // alternate names/spellings
      conceptRef: "",
      
    },
  ],
  quality: {
    // Overall quality assessment
    coverage: {
      score: 0.85, // 0..1 how complete is the coverage
      gaps: [], // what's missing or incomplete
      notes: "",
    },
    ambiguity: {
      score: 0.1, // 0..1 how much ambiguous content
      issues: [], // what's unclear
      notes: "",
    },
    consistency: {
      score: 0.9, // 0..1 how consistent are definitions/examples
      conflicts: [], // contradictions or inconsistencies
      notes: "",
    },
    confidence: {
      overall: 0.87, // 0..1 overall extraction confidence
      byDomain: {}, // confidence score per domain (e.g., concepts: 0.95, workflows: 0.75)
    },
    learningValue: {
      score: 0.88, // 0..1 pedagogical usefulness
      reasoning: "",
    },
  },
  extractionNotes: "", // notes about extraction process or challenges
};

/**
 * Validates Knowledge Model against schema.
 * Distinguishes fatal errors (version, metadata, quality) from recoverable warnings (missing items).
 * Returns { valid, isFatal, errors, warnings, fatalErrors }
 */
export function validateKnowledgeModel(model) {
  const fatalErrors = [];
  const warnings = [];

  if (!model) {
    return { valid: false, isFatal: true, errors: ["null model"], warnings: [], fatalErrors: ["null model"] };
  }

  // FATAL: Contract requires version
  if (!model.knowledgeModelVersion) {
    fatalErrors.push("Missing knowledgeModelVersion");
  }

  // FATAL: Contract requires metadata
  if (!model.documentMetadata) {
    fatalErrors.push("Missing documentMetadata");
  } else if (typeof model.documentMetadata.title !== "string") {
    fatalErrors.push("documentMetadata.title invalid");
  }

  // FATAL: Contract requires quality assessment
  if (!model.quality) {
    fatalErrors.push("Missing quality assessment");
  } else {
    const requiredQualityFields = ["coverage", "ambiguity", "consistency", "confidence", "learningValue"];
    for (const field of requiredQualityFields) {
      if (!(field in model.quality)) {
        fatalErrors.push(`quality missing ${field}`);
      }
    }
  }

  // WARNING: Domains are optional (extraction best-effort, may be incomplete)
  const domainNames = ["concepts", "definitions", "prerequisiteRelations", "examples", "workflows", "comparisons", "timelines", "formulas", "misconceptions", "interviewInsights", "applications", "aliases"];

  for (const domain of domainNames) {
    if (!(domain in model)) {
      warnings.push(`Missing domain: ${domain}`);
    }
  }

  // WARNING: Item metadata validation (extraction best-effort)
  const validateItems = (items, domainName) => {
    if (!Array.isArray(items)) {
      warnings.push(`${domainName} not array`);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!Array.isArray(item.evidenceRefs)) {
        warnings.push(`${domainName}[${i}] missing evidenceRefs`);
      }
      if (!["source_backed", "inferred"].includes(item.evidenceType)) {
        warnings.push(`${domainName}[${i}] invalid evidenceType`);
      }
      if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
        warnings.push(`${domainName}[${i}] confidence out of range`);
      }
    }
  };

  for (const domain of domainNames) {
    if (model[domain] !== undefined && Array.isArray(model[domain])) {
      validateItems(model[domain], domain);
    }
  }

  return {
    valid: fatalErrors.length === 0,
    isFatal: fatalErrors.length > 0,
    errors: [...fatalErrors, ...warnings],
    warnings,
    fatalErrors,
  };
}

export default KnowledgeModelSchema;
