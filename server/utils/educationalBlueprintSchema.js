/**
 * EDUCATIONAL BLUEPRINT SCHEMA & CONTRACT
 *
 * STATUS: Phase 1 - Educational planning contract
 *
 * This schema defines the structure and validation for an Educational Blueprint,
 * which answers: "How should this knowledge be learned?"
 *
 * SCOPE:
 * Includes:
 * - learning intent and goals
 * - entry concepts and learning sequence
 * - prerequisite chains and pedagogy notes
 * - visualization recommendations and emphasis areas
 * - quality assessment for the learning plan
 *
 * Excludes:
 * - graph ids
 * - canonical ids
 * - renderer models
 * - graph nodes
 * - graph edges
 * - chunk references
 */

export const EDUCATIONAL_BLUEPRINT_VERSION = "1.0.0";

/**
 * Complete Educational Blueprint structure.
 * This is the canonical contract produced for educational planning.
 */
export const EducationalBlueprintSchema = {
  blueprintVersion: EDUCATIONAL_BLUEPRINT_VERSION,
  documentIntent: {
    topic: "",
    audience: "",
    context: "",
    purpose: "",
  },
  learningGoal: "",
  entryConcepts: [
    {
      concept: "",
      rationale: "",
    },
  ],
  learningSequence: [
    {
      order: 1,
      concept: "",
      label: "",
      conceptsInvolved: [],
      rationale: "",
    },
  ],
  prerequisiteChains: [
    {
      concept: "",
      prerequisites: [],
    },
  ],
  visualizationPlan: {
    approach: "",
    notes: "",
  },
  emphasisAreas: [],
  optionalTopics: [],
  estimatedDifficulty: "",
  pedagogyNotes: [],
  quality: {
    clarity: 0.0,
    coverage: 0.0,
    coherence: 0.0,
    notes: "",
  },
  timestamp: "",
};

/**
 * Validates an Educational Blueprint against the schema.
 * Distinguishes fatal errors from recoverable warnings.
 * Returns { valid, isFatal, errors, warnings, fatalErrors }.
 */
export function validateEducationalBlueprint(blueprint) {
  const fatalErrors = [];
  const warnings = [];

  if (!blueprint || typeof blueprint !== "object" || Array.isArray(blueprint)) {
    return {
      valid: false,
      isFatal: true,
      errors: ["Educational blueprint must be an object"],
      warnings: [],
      fatalErrors: ["Educational blueprint must be an object"],
    };
  }

  if (!blueprint.blueprintVersion) {
    fatalErrors.push("Missing blueprintVersion");
  }

  if (
    !blueprint.documentIntent ||
    typeof blueprint.documentIntent !== "object" ||
    Array.isArray(blueprint.documentIntent)
  ) {
    fatalErrors.push("Missing documentIntent");
  } else {
    const { topic, audience, context, purpose } = blueprint.documentIntent;
    if (typeof topic !== "string" || !topic.trim()) {
      fatalErrors.push("documentIntent.topic invalid");
    }
    if (typeof audience !== "string" || !audience.trim()) {
      warnings.push("documentIntent.audience missing");
    }
    if (typeof context !== "string" || !context.trim()) {
      warnings.push("documentIntent.context missing");
    }
    if (typeof purpose !== "string" || !purpose.trim()) {
      warnings.push("documentIntent.purpose missing");
    }
  }

  if (
    typeof blueprint.learningGoal !== "string" ||
    !blueprint.learningGoal.trim()
  ) {
    fatalErrors.push("Missing learningGoal");
  }

  if (!Array.isArray(blueprint.entryConcepts)) {
    fatalErrors.push("entryConcepts must be an array");
  } else {
    blueprint.entryConcepts.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        warnings.push(`entryConcepts[${index}] invalid`);
        return;
      }
      if (typeof item.concept !== "string" || !item.concept.trim()) {
        warnings.push(`entryConcepts[${index}] concept missing`);
      }
    });
  }

  if (!Array.isArray(blueprint.learningSequence)) {
    fatalErrors.push("learningSequence must be an array");
  } else {
    blueprint.learningSequence.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        warnings.push(`learningSequence[${index}] invalid`);
        return;
      }
      if (typeof item.label !== "string" || !item.label.trim()) {
        warnings.push(`learningSequence[${index}] label missing`);
      }
      const hasConcept = typeof item.concept === "string" && item.concept.trim();
      const hasLabel = typeof item.label === "string" && item.label.trim();
      if (!hasConcept && !hasLabel) {
        warnings.push(`learningSequence[${index}] concept or label missing`);
      }
    });
  }

  if (!Array.isArray(blueprint.prerequisiteChains)) {
    warnings.push("prerequisiteChains should be an array");
  } else {
    blueprint.prerequisiteChains.forEach((chain, index) => {
      if (!chain || typeof chain !== "object" || Array.isArray(chain)) {
        warnings.push(`prerequisiteChains[${index}] invalid`);
        return;
      }
      if (typeof chain.concept !== "string" || !chain.concept.trim()) {
        warnings.push(`prerequisiteChains[${index}] concept missing`);
      }
      if (!Array.isArray(chain.prerequisites)) {
        warnings.push(`prerequisiteChains[${index}] prerequisites invalid`);
      }
    });
  }

  if (
    !blueprint.visualizationPlan ||
    typeof blueprint.visualizationPlan !== "object" ||
    Array.isArray(blueprint.visualizationPlan)
  ) {
    warnings.push("visualizationPlan missing");
  } else if (
    typeof blueprint.visualizationPlan.approach !== "string" ||
    !blueprint.visualizationPlan.approach.trim()
  ) {
    warnings.push("visualizationPlan.approach missing");
  }

  if (!Array.isArray(blueprint.emphasisAreas)) {
    warnings.push("emphasisAreas should be an array");
  }

  if (!Array.isArray(blueprint.optionalTopics)) {
    warnings.push("optionalTopics should be an array");
  }

  if (
    typeof blueprint.estimatedDifficulty !== "string" ||
    !blueprint.estimatedDifficulty.trim()
  ) {
    warnings.push("estimatedDifficulty missing");
  }

  if (blueprint.pedagogyNotes !== undefined) {
    const isValidArray =
      Array.isArray(blueprint.pedagogyNotes) &&
      blueprint.pedagogyNotes.every((note) => typeof note === "string");
    const isValidString = typeof blueprint.pedagogyNotes === "string";
    if (!isValidArray && !isValidString) {
      warnings.push("pedagogyNotes must be a string or an array of strings");
    }
  }

  if (
    !blueprint.quality ||
    typeof blueprint.quality !== "object" ||
    Array.isArray(blueprint.quality)
  ) {
    warnings.push("quality missing");
  } else {
    const { clarity, coverage, coherence } = blueprint.quality;
    if (typeof clarity !== "number" || clarity < 0 || clarity > 1) {
      warnings.push("quality.clarity invalid");
    }
    if (typeof coverage !== "number" || coverage < 0 || coverage > 1) {
      warnings.push("quality.coverage invalid");
    }
    if (typeof coherence !== "number" || coherence < 0 || coherence > 1) {
      warnings.push("quality.coherence invalid");
    }
  }

  if (typeof blueprint.timestamp !== "string" || !blueprint.timestamp.trim()) {
    warnings.push("timestamp missing");
  }

  return {
    valid: fatalErrors.length === 0,
    isFatal: fatalErrors.length > 0,
    errors: [...fatalErrors, ...warnings],
    warnings,
    fatalErrors,
  };
}

export default EducationalBlueprintSchema;
