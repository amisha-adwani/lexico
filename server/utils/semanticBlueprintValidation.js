function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function clamp01(value, fallback = 0.7) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

function normalizeDensity(value) {
  const normalized = asString(value, "medium").toLowerCase();
  if (normalized === "sparse" || normalized === "medium" || normalized === "dense") {
    return normalized;
  }
  return "medium";
}

function normalizeHierarchy(nodes) {
  if (!Array.isArray(nodes)) return { value: [], dropped: 0 };

  let dropped = 0;

  const value = nodes
    .map((node) => {
      if (!node || typeof node !== "object") {
        dropped += 1;
        return null;
      }
      const label = asString(node.label);
      if (!label) {
        dropped += 1;
        return null;
      }

      const normalized = { label };
      const childResult = normalizeHierarchy(node.children);
      dropped += childResult.dropped;
      if (childResult.value.length > 0) {
        normalized.children = childResult.value;
      }

      return normalized;
    })
    .filter(Boolean);

  return { value, dropped };
}

function normalizeStringArray(values) {
  return toArray(values)
    .map((value) => asString(value))
    .filter(Boolean);
}

function normalizeWorkflows(plans) {
  if (!Array.isArray(plans)) return { value: [], dropped: 0 };

  let dropped = 0;
  const value = plans
    .map((plan) => {
      if (!plan || typeof plan !== "object") {
        dropped += 1;
        return null;
      }

      const name = asString(plan.name);
      const steps = normalizeStringArray(plan.steps);
      if (steps.length === 0) {
        dropped += 1;
        return null;
      }

      const normalized = { steps };
      if (name) normalized.name = name;

      const decisionPoints = normalizeStringArray(plan.decisionPoints);
      if (decisionPoints.length > 0) normalized.decisionPoints = decisionPoints;

      const branches = normalizeStringArray(plan.branches);
      if (branches.length > 0) normalized.branches = branches;

      return normalized;
    })
    .filter(Boolean);

  return { value, dropped };
}

function normalizeComparisons(plans) {
  if (!Array.isArray(plans)) return { value: [], dropped: 0 };

  let dropped = 0;
  const value = plans
    .map((plan) => {
      if (!plan || typeof plan !== "object") {
        dropped += 1;
        return null;
      }

      const name = asString(plan.name);
      const items = normalizeStringArray(plan.items);
      if (items.length === 0) {
        dropped += 1;
        return null;
      }

      const normalized = { items };
      if (name) normalized.name = name;

      const criteria = normalizeStringArray(plan.criteria);
      if (criteria.length > 0) normalized.criteria = criteria;

      return normalized;
    })
    .filter(Boolean);

  return { value, dropped };
}

function normalizeTimelines(plans) {
  if (!Array.isArray(plans)) return { value: [], dropped: 0 };

  let dropped = 0;
  const value = plans
    .map((plan) => {
      if (!plan || typeof plan !== "object") {
        dropped += 1;
        return null;
      }

      const name = asString(plan.name);
      const events = toArray(plan.events)
        .map((event) => {
          if (!event || typeof event !== "object") return null;
          const label = asString(event.label);
          if (!label) return null;
          const normalized = { label };
          const time = asString(event.time);
          if (time) normalized.time = time;
          return normalized;
        })
        .filter(Boolean);

      if (events.length === 0) {
        dropped += 1;
        return null;
      }

      const normalized = { events };
      if (name) normalized.name = name;
      return normalized;
    })
    .filter(Boolean);

  return { value, dropped };
}

function normalizeDuplicates(duplicates) {
  if (!Array.isArray(duplicates)) return { value: [], dropped: 0 };

  let dropped = 0;

  const value = duplicates
    .map((group) => (group && typeof group === "object" ? group : null))
    .filter(Boolean)
    .map((group) => ({
      canonical: asString(group.canonical),
      duplicates: toArray(group.duplicates)
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim()),
    }))
    .map((group) => {
      if (!group.canonical) {
        dropped += 1;
        return null;
      }

      const canonicalKey = group.canonical.toLowerCase();
      const uniqueDuplicates = [];
      const seen = new Set();
      for (const duplicate of group.duplicates) {
        const key = duplicate.toLowerCase();
        if (!key || key === canonicalKey || seen.has(key)) continue;
        seen.add(key);
        uniqueDuplicates.push(duplicate);
      }

      if (uniqueDuplicates.length === 0) {
        dropped += 1;
        return null;
      }

      return {
        canonical: group.canonical,
        duplicates: uniqueDuplicates,
      };
    })
    .filter(Boolean);

  return { value, dropped };
}

function addRepair(repairLog, condition, message) {
  if (condition) repairLog.push(message);
}

export default function validateSemanticBlueprint(blueprint) {
  const errors = [];
  const warnings = [];
  const repairLog = [];

  if (!blueprint || typeof blueprint !== "object" || Array.isArray(blueprint)) {
    errors.push("semantic blueprint must be an object");
    return {
      isValid: false,
      isRepairable: false,
      errors,
      warnings,
      repairLog,
      repaired: null,
    };
  }

  const legacyGraphPlan = blueprint.graphPlan && typeof blueprint.graphPlan === "object" ? blueprint.graphPlan : {};
  const documentIntent = blueprint.documentIntent && typeof blueprint.documentIntent === "object" ? blueprint.documentIntent : null;

  const rawHierarchy =
    toArray(blueprint.topologyPlan?.plannedHierarchy).length > 0
      ? blueprint.topologyPlan.plannedHierarchy
      : blueprint.plannedHierarchy;
  const normalizedHierarchy = normalizeHierarchy(rawHierarchy);

  const rawWorkflows =
    toArray(blueprint.artifactPlans?.workflows).length > 0
      ? blueprint.artifactPlans.workflows
      : blueprint.workflowPlans;
  const normalizedWorkflows = normalizeWorkflows(rawWorkflows);

  const rawComparisons =
    toArray(blueprint.artifactPlans?.comparisons).length > 0
      ? blueprint.artifactPlans.comparisons
      : blueprint.comparisonPlans;
  const normalizedComparisons = normalizeComparisons(rawComparisons);

  const rawTimelines =
    toArray(blueprint.artifactPlans?.timelines).length > 0
      ? blueprint.artifactPlans.timelines
      : blueprint.timelinePlans;
  const normalizedTimelines = normalizeTimelines(rawTimelines);

  const rawDuplicates =
    toArray(blueprint.artifactPlans?.duplicates).length > 0
      ? blueprint.artifactPlans.duplicates
      : blueprint.duplicateGroups;
  const normalizedDuplicates = normalizeDuplicates(rawDuplicates);

  const repaired = {
    documentIntent: {
      types: normalizeStringArray(documentIntent?.types || blueprint.documentType),
      organization: normalizeStringArray(documentIntent?.organization || blueprint.organization),
      mainTopic: asString(documentIntent?.mainTopic || blueprint.mainTopic || "Untitled"),
    },
    topologyPlan: {
      plannedHierarchy: normalizedHierarchy.value,
      clusters: toArray(blueprint.topologyPlan?.clusters).length
        ? toArray(blueprint.topologyPlan.clusters)
        : toArray(legacyGraphPlan.clusters),
      crossLinks: toArray(blueprint.topologyPlan?.crossLinks).length
        ? toArray(blueprint.topologyPlan.crossLinks)
        : toArray(legacyGraphPlan.crossLinks),
      graphDensity: normalizeDensity(
        blueprint.topologyPlan?.graphDensity || legacyGraphPlan.graphDensity || "medium"
      ),
    },
    artifactPlans: {
      workflows: normalizedWorkflows.value,
      comparisons: normalizedComparisons.value,
      timelines: normalizedTimelines.value,
      duplicates: normalizedDuplicates.value,
    },
    qualitySignals: {
      planningConfidence: clamp01(
        blueprint.qualitySignals?.planningConfidence ?? blueprint.planningConfidence,
        0.7
      ),
      ambiguities: toArray(blueprint.qualitySignals?.ambiguities),
    },
  };

  if (!repaired.documentIntent.mainTopic) {
    repaired.documentIntent.mainTopic = "Untitled";
    repairLog.push("Set missing mainTopic to Untitled");
  }

  addRepair(
    repairLog,
    !blueprint.documentIntent && (blueprint.documentType || blueprint.organization || blueprint.mainTopic),
    "Mapped legacy documentType/organization/mainTopic into documentIntent"
  );
  addRepair(
    repairLog,
    !asString(documentIntent?.mainTopic) && !asString(blueprint.mainTopic),
    "Set missing mainTopic to Untitled"
  );
  addRepair(
    repairLog,
    !blueprint.topologyPlan && (blueprint.plannedHierarchy || blueprint.graphPlan),
    "Mapped legacy plannedHierarchy/graphPlan into topologyPlan"
  );
  addRepair(
    repairLog,
    !blueprint.artifactPlans &&
      (blueprint.workflowPlans || blueprint.comparisonPlans || blueprint.timelinePlans || blueprint.duplicateGroups),
    "Mapped legacy workflowPlans/comparisonPlans/timelinePlans/duplicateGroups into artifactPlans"
  );
  addRepair(
    repairLog,
    normalizedHierarchy.dropped > 0,
    `Dropped ${normalizedHierarchy.dropped} invalid plannedHierarchy entries`
  );
  addRepair(
    repairLog,
    normalizedWorkflows.dropped > 0,
    `Dropped ${normalizedWorkflows.dropped} invalid workflow plans (missing usable steps)`
  );
  addRepair(
    repairLog,
    normalizedComparisons.dropped > 0,
    `Dropped ${normalizedComparisons.dropped} invalid comparison plans (missing usable items)`
  );
  addRepair(
    repairLog,
    normalizedTimelines.dropped > 0,
    `Dropped ${normalizedTimelines.dropped} invalid timeline plans (missing usable events)`
  );
  addRepair(
    repairLog,
    normalizedDuplicates.dropped > 0,
    `Dropped ${normalizedDuplicates.dropped} invalid duplicate groups`
  );

  if (repaired.documentIntent.types.length === 0) {
    warnings.push("documentIntent.types is empty");
  }

  if (repaired.topologyPlan.plannedHierarchy.length === 0) {
    warnings.push("plannedHierarchy is empty; builder may infer more structure");
  }

  return {
    isValid: errors.length === 0,
    isRepairable: repairLog.length > 0,
    errors,
    warnings,
    repairLog,
    repaired,
  };
}
