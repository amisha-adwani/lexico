function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function flattenHierarchy(nodes, depth = 1, parentLabel = null, rows = []) {
  if (!Array.isArray(nodes)) return rows;

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const label = typeof node.label === "string" ? node.label.trim() : "";
    if (!label) continue;
    rows.push({ label, depth, parentLabel });
    flattenHierarchy(node.children, depth + 1, label, rows);
  }

  return rows;
}

function createNodeIndexes(ir = {}) {
  const nodes = Array.isArray(ir.nodes) ? ir.nodes : [];
  const byId = new Map();
  const labelsById = new Map();
  const idsByLabel = new Map();
  const parentsById = new Map();

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const id = typeof node.id === "string" ? node.id.trim() : "";
    const label = typeof node.label === "string" ? node.label.trim() : "";
    if (!id) continue;

    byId.set(id, node);
    labelsById.set(id, label);

    const labelKey = normalize(label);
    if (labelKey) {
      if (!idsByLabel.has(labelKey)) idsByLabel.set(labelKey, []);
      idsByLabel.get(labelKey).push(id);
    }

    const parentId = typeof node.parentId === "string" ? node.parentId.trim() : "";
    if (parentId) parentsById.set(id, parentId);
  }

  return { byId, labelsById, idsByLabel, parentsById };
}

function getNodeIdsForSequence(sequence = {}) {
  return Array.isArray(sequence?.nodeIds)
    ? sequence.nodeIds.filter((id) => typeof id === "string" && id.trim())
    : [];
}

function computeHierarchyDepth(nodesById, parentsById) {
  let maxDepth = 0;

  for (const nodeId of nodesById.keys()) {
    let depth = 1;
    let currentId = nodeId;
    const seen = new Set([nodeId]);

    while (parentsById.has(currentId)) {
      const parentId = parentsById.get(currentId);
      if (!parentId || !nodesById.has(parentId) || seen.has(parentId)) break;
      seen.add(parentId);
      depth += 1;
      currentId = parentId;
    }

    if (depth > maxDepth) maxDepth = depth;
  }

  return maxDepth;
}

function isSubsequence(planned, actual) {
  if (planned.length === 0) return true;
  let cursor = 0;
  for (const label of actual) {
    if (normalize(label) === normalize(planned[cursor])) {
      cursor += 1;
      if (cursor === planned.length) return true;
    }
  }
  return false;
}

function diagnoseHierarchy(blueprint, indexes) {
  const diagnostics = [];
  const warnings = [];
  const planned = flattenHierarchy(blueprint.topologyPlan?.plannedHierarchy);

  if (planned.length === 0) return { warnings, diagnostics };

  const missing = [];
  let parentMismatches = 0;
  for (const entry of planned) {
    const nodeIds = indexes.idsByLabel.get(normalize(entry.label)) || [];
    if (nodeIds.length === 0) {
      missing.push(entry.label);
      continue;
    }

    if (entry.parentLabel) {
      const plannedParentKey = normalize(entry.parentLabel);
      const hasMatchingParent = nodeIds.some((nodeId) => {
        const parentId = indexes.parentsById.get(nodeId);
        const parentLabel = parentId ? indexes.labelsById.get(parentId) : "";
        return normalize(parentLabel) === plannedParentKey;
      });

      if (!hasMatchingParent) parentMismatches += 1;
    }
  }

  const plannedDepth = planned.reduce((maxDepth, entry) => Math.max(maxDepth, entry.depth), 0);
  const realizedDepth = computeHierarchyDepth(indexes.byId, indexes.parentsById);
  const depthGap = plannedDepth > 0 ? (plannedDepth - realizedDepth) / plannedDepth : 0;

  diagnostics.push({
    area: "hierarchy",
    plannedCount: planned.length,
    missingCount: missing.length,
    parentMismatches,
    plannedDepth,
    realizedDepth,
    depthGap: Number(depthGap.toFixed(2)),
  });

  if (missing.length > 0) {
    warnings.push(
      `blueprint fidelity: ${missing.length}/${planned.length} planned hierarchy labels were not realized as nodes`
    );
  }
  if (parentMismatches > 0) {
    warnings.push(
      `blueprint fidelity: ${parentMismatches} planned hierarchy nodes do not have the expected parent in Canonical IR`
    );
  }
  if (plannedDepth >= 3 && depthGap > 0.34) {
    warnings.push(
      `blueprint fidelity: realized hierarchy depth ${realizedDepth} is significantly shallower than planned depth ${plannedDepth}`
    );
  }

  return { warnings, diagnostics };
}

function diagnoseWorkflows(blueprint, ir, indexes) {
  const diagnostics = [];
  const warnings = [];
  const workflows = Array.isArray(blueprint.artifactPlans?.workflows) ? blueprint.artifactPlans.workflows : [];
  if (workflows.length === 0) return { warnings, diagnostics };

  const sequences = Array.isArray(ir.sequences) ? ir.sequences : [];
  let gaps = 0;

  for (const workflow of workflows) {
    const workflowName = normalize(workflow?.name);
    const steps = Array.isArray(workflow?.steps)
      ? workflow.steps.filter((step) => typeof step === "string" && step.trim())
      : [];
    const decisionPoints = Array.isArray(workflow?.decisionPoints)
      ? workflow.decisionPoints.filter((step) => typeof step === "string" && step.trim())
      : [];
    const branches = Array.isArray(workflow?.branches)
      ? workflow.branches.filter((step) => typeof step === "string" && step.trim())
      : [];

    const matchingSequence = sequences.find((sequence) => {
      const sequenceLabel = normalize(sequence?.label);
      const sequenceType = normalize(sequence?.type);
      if (workflowName && sequenceLabel !== workflowName) return false;
      return sequenceType === "workflow" || sequenceType === "process";
    });

    const sequenceLabels = matchingSequence
      ? getNodeIdsForSequence(matchingSequence)
          .map((nodeId) => indexes.labelsById.get(nodeId) || "")
          .filter(Boolean)
      : [];
    const orderPreserved = isSubsequence(steps, sequenceLabels);
    const missingSteps = steps.filter(
      (step) => !sequenceLabels.some((sequenceLabel) => normalize(sequenceLabel) === normalize(step))
    );

    const decisionsPreserved = decisionPoints.every(
      (point) => (indexes.idsByLabel.get(normalize(point)) || []).length > 0
    );
    const branchesPreserved = branches.every(
      (branch) => (indexes.idsByLabel.get(normalize(branch)) || []).length > 0
    );

    const ok =
      Boolean(matchingSequence) &&
      missingSteps.length === 0 &&
      orderPreserved &&
      decisionsPreserved &&
      branchesPreserved;
    if (!ok) gaps += 1;

    diagnostics.push({
      area: "workflow",
      name: workflow?.name || "(unnamed workflow)",
      sequenceFound: Boolean(matchingSequence),
      plannedSteps: steps.length,
      missingSteps: missingSteps.length,
      orderPreserved,
      decisionsPreserved,
      branchesPreserved,
    });
  }

  if (gaps > 0) {
    warnings.push(`blueprint coverage: ${gaps}/${workflows.length} workflow plans were only partially realized`);
  }

  return { warnings, diagnostics };
}

function diagnoseTimelines(blueprint, ir, indexes) {
  const diagnostics = [];
  const warnings = [];
  const timelines = Array.isArray(blueprint.artifactPlans?.timelines) ? blueprint.artifactPlans.timelines : [];
  if (timelines.length === 0) return { warnings, diagnostics };

  const sequences = Array.isArray(ir.sequences) ? ir.sequences : [];
  let gaps = 0;

  for (const timeline of timelines) {
    const timelineName = normalize(timeline?.name);
    const events = Array.isArray(timeline?.events) ? timeline.events : [];
    const eventLabels = events
      .map((event) => (typeof event?.label === "string" ? event.label.trim() : ""))
      .filter(Boolean);

    const matchingSequence = sequences.find((sequence) => {
      const sequenceLabel = normalize(sequence?.label);
      const sequenceType = normalize(sequence?.type);
      if (timelineName && sequenceLabel !== timelineName) return false;
      return sequenceType === "timeline";
    });

    const sequenceLabels = matchingSequence
      ? getNodeIdsForSequence(matchingSequence)
          .map((nodeId) => indexes.labelsById.get(nodeId) || "")
          .filter(Boolean)
      : [];

    const orderPreserved = isSubsequence(eventLabels, sequenceLabels);
    const missingEvents = eventLabels.filter(
      (label) => !sequenceLabels.some((sequenceLabel) => normalize(sequenceLabel) === normalize(label))
    );

    let timestampMismatches = 0;
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const labelKey = normalize(event.label);
      if (!labelKey || !event.time) continue;
      const nodeIds = indexes.idsByLabel.get(labelKey) || [];
      if (nodeIds.length === 0) continue;
      const hasTimeMatch = nodeIds.some((nodeId) => {
        const node = indexes.byId.get(nodeId);
        return normalize(node?.time) === normalize(event.time);
      });
      if (!hasTimeMatch) timestampMismatches += 1;
    }

    const ok =
      Boolean(matchingSequence) &&
      missingEvents.length === 0 &&
      orderPreserved &&
      timestampMismatches === 0;
    if (!ok) gaps += 1;

    diagnostics.push({
      area: "timeline",
      name: timeline?.name || "(unnamed timeline)",
      sequenceFound: Boolean(matchingSequence),
      plannedEvents: eventLabels.length,
      missingEvents: missingEvents.length,
      orderPreserved,
      timestampMismatches,
    });
  }

  if (gaps > 0) {
    warnings.push(`blueprint coverage: ${gaps}/${timelines.length} timeline plans were only partially realized`);
  }

  return { warnings, diagnostics };
}

function diagnoseComparisons(blueprint, ir) {
  const diagnostics = [];
  const warnings = [];
  const comparisons = Array.isArray(blueprint.artifactPlans?.comparisons) ? blueprint.artifactPlans.comparisons : [];
  if (comparisons.length === 0) return { warnings, diagnostics };

  const realized = Array.isArray(ir.comparisons) ? ir.comparisons : [];
  let gaps = 0;

  for (const plannedComparison of comparisons) {
    const plannedName = normalize(plannedComparison?.name);
    const plannedItems = Array.isArray(plannedComparison?.items)
      ? plannedComparison.items.filter((item) => typeof item === "string" && item.trim())
      : [];
    const plannedCriteria = Array.isArray(plannedComparison?.criteria)
      ? plannedComparison.criteria.filter((criterion) => typeof criterion === "string" && criterion.trim())
      : [];

    const comparison = realized.find((entry) => normalize(entry?.label) === plannedName);
    const comparisonItems = Array.isArray(comparison?.items) ? comparison.items : [];

    const missingItems = plannedItems.filter(
      (item) => !comparisonItems.some((comparisonItem) => normalize(comparisonItem?.name) === normalize(item))
    );

    const criteriaPreserved =
      plannedCriteria.length === 0 ||
      comparisonItems.some((item) => {
        const criteria = Array.isArray(item?.criteria) ? item.criteria : [];
        const criteriaKeys = new Set(criteria.map((criterion) => normalize(criterion?.criterion)).filter(Boolean));
        return plannedCriteria.every((criterion) => criteriaKeys.has(normalize(criterion)));
      });

    const ok = Boolean(comparison) && missingItems.length === 0 && criteriaPreserved;
    if (!ok) gaps += 1;

    diagnostics.push({
      area: "comparison",
      name: plannedComparison?.name || "(unnamed comparison)",
      comparisonFound: Boolean(comparison),
      plannedItems: plannedItems.length,
      missingItems: missingItems.length,
      criteriaPreserved,
    });
  }

  if (gaps > 0) {
    warnings.push(`blueprint coverage: ${gaps}/${comparisons.length} comparison plans were only partially realized`);
  }

  return { warnings, diagnostics };
}

function diagnoseDuplicates(blueprint, indexes) {
  const diagnostics = [];
  const warnings = [];
  const duplicates = Array.isArray(blueprint.artifactPlans?.duplicates) ? blueprint.artifactPlans.duplicates : [];
  if (duplicates.length === 0) return { warnings, diagnostics };

  let leakage = 0;
  for (const group of duplicates) {
    const canonical = normalize(group?.canonical);
    const duplicateLabels = Array.isArray(group?.duplicates)
      ? group.duplicates.filter((label) => typeof label === "string" && label.trim())
      : [];
    if (!canonical) continue;

    const canonicalExists = (indexes.idsByLabel.get(canonical) || []).length > 0;
    const leakedDuplicates = duplicateLabels.filter(
      (label) => (indexes.idsByLabel.get(normalize(label)) || []).length > 0
    );

    if (canonicalExists && leakedDuplicates.length > 0) leakage += 1;

    diagnostics.push({
      area: "duplicates",
      canonical: group?.canonical || "(unnamed canonical)",
      canonicalExists,
      leakedDuplicates: leakedDuplicates.length,
    });
  }

  if (leakage > 0) {
    warnings.push(`blueprint quality: ${leakage}/${duplicates.length} duplicate groups leaked into final node labels`);
  }

  return { warnings, diagnostics };
}

function diagnoseGraphDensity(blueprint, ir) {
  const warnings = [];
  const diagnostics = [];

  const density = normalize(blueprint.topologyPlan?.graphDensity || "medium");
  const nodeCount = Array.isArray(ir.nodes) ? ir.nodes.length : 0;
  const relationCount = Array.isArray(ir.relations) ? ir.relations.length : 0;
  const relationRatio = nodeCount > 0 ? relationCount / nodeCount : 0;

  let minRatio = 0;
  let maxRatio = Infinity;
  if (density === "sparse") {
    minRatio = 0;
    maxRatio = 1.1;
  } else if (density === "medium") {
    minRatio = 0.35;
    maxRatio = 2.2;
  } else if (density === "dense") {
    minRatio = 0.75;
  }

  const ratioOutOfRange = relationRatio < minRatio || relationRatio > maxRatio;
  if (nodeCount >= 6 && ratioOutOfRange) {
    warnings.push(
      `blueprint fidelity: graph density "${density}" expected relation ratio ${minRatio.toFixed(2)}-${Number.isFinite(maxRatio) ? maxRatio.toFixed(2) : "inf"}, got ${relationRatio.toFixed(2)}`
    );
  }

  diagnostics.push({
    area: "graph",
    requestedDensity: density,
    nodeCount,
    relationCount,
    relationRatio: Number(relationRatio.toFixed(2)),
  });

  return { warnings, diagnostics };
}

export default function validateBlueprintExecution(blueprint, ir) {
  const warnings = [];
  const details = [];
  const diagnostics = [];

  if (!blueprint || typeof blueprint !== "object" || !ir || typeof ir !== "object") {
    return { warnings, details, diagnostics };
  }

  const indexes = createNodeIndexes(ir);

  const hierarchy = diagnoseHierarchy(blueprint, indexes);
  const workflows = diagnoseWorkflows(blueprint, ir, indexes);
  const timelines = diagnoseTimelines(blueprint, ir, indexes);
  const comparisons = diagnoseComparisons(blueprint, ir);
  const duplicates = diagnoseDuplicates(blueprint, indexes);
  const graph = diagnoseGraphDensity(blueprint, ir);

  warnings.push(
    ...hierarchy.warnings,
    ...workflows.warnings,
    ...timelines.warnings,
    ...comparisons.warnings,
    ...duplicates.warnings,
    ...graph.warnings
  );

  diagnostics.push(
    ...hierarchy.diagnostics,
    ...workflows.diagnostics,
    ...timelines.diagnostics,
    ...comparisons.diagnostics,
    ...duplicates.diagnostics,
    ...graph.diagnostics
  );

  details.push(
    `coverage metrics: hierarchy=${hierarchy.diagnostics[0]?.plannedCount || 0}, workflows=${workflows.diagnostics.length}, comparisons=${comparisons.diagnostics.length}, timelines=${timelines.diagnostics.length}, relations=${Array.isArray(ir.relations) ? ir.relations.length : 0}`
  );
  for (const diagnostic of diagnostics) {
    details.push(`diagnostic ${diagnostic.area}: ${JSON.stringify(diagnostic)}`);
  }

  return { warnings, details, diagnostics };
}
