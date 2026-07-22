import { sortByImportance, extractSourceCitations } from "./utils.js";
import {
  cleanDocument,
  isComparisonDocument,
  isProceduralDocument,
  isChronologicalDocument,
} from "../visualizationSuitability.js";

const MAX_ROWS = 100;
const SUMMARY_LENGTH = 120;

export default function toTableViewModel(canonicalIR) {
  const {
    document = {},
    nodes = [],
    sequences = [],
    comparisons = [],
    sourceMap = {},
  } = canonicalIR;
  const clean = cleanDocument(document);

  if (isComparisonDocument(canonicalIR) && !isProceduralDocument(canonicalIR)) {
    return buildComparisonTable(clean, comparisons, nodes, sourceMap);
  }

  if (
    isProceduralDocument(canonicalIR) ||
    isChronologicalDocument(canonicalIR)
  ) {
    return buildSequenceTable(clean, nodes, sequences, sourceMap);
  }

  const columns = [
    { id: "label", label: "Name" },
    { id: "type", label: "Type" },
    { id: "importance", label: "Importance" },
    { id: "summary", label: "Description" },
  ];

  const rows = sortByImportance(nodes)
    .slice(0, MAX_ROWS)
    .map((node) => ({
      nodeId: node.id,
      label: node.label || "Untitled",
      type: node.type || "concept",
      importance: node.importance != null ? Number(node.importance.toFixed(2)) : "",
      summary: node.summary || "",
      sourceRefs: node.sourceRefs || [],
      citations: extractSourceCitations(node, sourceMap),
    }));

  return {
    title: clean.title || "Data Table",
    summary: clean.summary || "",
    columns,
    rows,
  };
}

function buildSequenceTable(document, nodes, sequences, sourceMap) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const rows = [];

  sequences
    .filter((sequence) =>
      ["timeline", "process", "workflow"].includes(
        (sequence.type || "").toLowerCase(),
      ),
    )
    .forEach((sequence) => {
      (sequence.nodeIds || []).forEach((nodeId, index) => {
        const node = nodeMap[nodeId];

        if (!node) {
          return;
        }

        rows.push({
          nodeId: node.id,
          step: index + 1,
          action: node.label || `Step ${index + 1}`,
          description: node.summary || "",
          sourceRefs: node.sourceRefs || [],
          citations: extractSourceCitations(node, sourceMap),
        });
      });
    });
  if (!rows.length) {
    return {
      title: document.title || "Data Table",
      summary: document.summary || "",
      columns: [
        { id: "label", label: "Name" },
        { id: "type", label: "Type" },
        { id: "summary", label: "Description" },
      ],
      rows: sortByImportance(nodes)
        .slice(0, MAX_ROWS)
        .map((node) => ({
          nodeId: node.id,
          label: node.label || "Untitled",
          type: node.type || "concept",
          summary: node.summary || "",
          sourceRefs: node.sourceRefs || [],
          citations: extractSourceCitations(node, sourceMap),
        })),
    };
  }
  return {
    title: document.title || "Process Table",
    summary: document.summary || "",
    columns: [
      { id: "step", label: "Step" },
      { id: "action", label: "Action" },
      { id: "description", label: "Description" },
    ],
    rows,
  };
}

function buildComparisonTable(document, comparisons, nodes, sourceMap) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const items = comparisons.flatMap((comparison) =>
    Array.isArray(comparison.items) ? comparison.items : [],
  );
  const criteriaNames = Array.from(
    new Set(
      items.flatMap((item) =>
        (item.criteria || []).filter((c) => c.value).map((c) => c.criterion),
      ),
    ),
  );
  const columns = [
    { id: "label", label: "Entity" },
    ...criteriaNames.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, "_"),
      label: name,
    })),
  ];

  const seen = new Set();

  const uniqueItems = items.filter((item) => {
    if (seen.has(item.itemId)) return false;
    seen.add(item.itemId);
    return true;
  });

  const rows = uniqueItems.map((item) => {
    const node = nodeMap[item.itemId];
    const row = {
      nodeId: item.itemId,
      label: node?.label || item.name || "Item",
      sourceRefs: node?.sourceRefs || [],
      citations: node ? extractSourceCitations(node, sourceMap) : [],
    };

    criteriaNames.forEach((name) => {
      const found = Array.isArray(item.criteria)
        ? item.criteria.find(
            (criterion) => (criterion.criterion || "Property") === name,
          )
        : null;
      row[name.toLowerCase().replace(/\s+/g, "_")] = found?.value || "";
    });

    return row;
  });

  return {
    title: document.title || "Comparison Table",
    summary: document.summary || "",
    columns,
    rows,
  };
}
