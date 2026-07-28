import { extractSourceCitations, sortByImportance } from './utils.js';
import { cleanDocument, isTimelineDocument } from '../visualizationSuitability.js';

export default function toTimelineViewModel(canonicalIR) {
  const { document = {}, nodes = [], sequences = [], sourceMap = {} } = canonicalIR;
  const clean = cleanDocument(document);

  if (!nodes || nodes.length === 0) {
    return {
      title: clean.title || 'Timeline',
      summary: clean.summary || '',
      points: [],
    };
  }

  if (!isTimelineDocument(canonicalIR)) {
    return {
      title: clean.title || 'Timeline',
      summary: clean.summary || '',
      points: [],
    };
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  // FALLBACK A: Use timeline sequences
  const timelineSequences = sequences.filter(s => s.type === 'timeline');
  if (timelineSequences.length > 0) {
    return buildTimelineFromSequences(timelineSequences, nodeMap, clean, sourceMap);
  }

  // FALLBACK B: Use process/workflow sequences
  const processSequences = sequences.filter(s => s.type === 'process' || s.type === 'workflow');
  if (processSequences.length > 0) {
    return buildTimelineFromSequences(processSequences, nodeMap, clean, sourceMap);
  }

  // FALLBACK C: Use nodes with timestamps
  const timedNodes = nodes
    .filter(n => isValidTimestampString(n?.time))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  
  if (timedNodes.length > 0) {
    const points = timedNodes.map((node, index) =>
      buildTimelinePoint({
        node,
        order: index + 1,
        fallbackLabelPrefix: 'Event',
        sourceMap,
      })
    );

    return {
      title: clean.title || 'Timeline',
      summary: clean.summary || '',
      points,
    };
  }

  // FALLBACK D: Use important nodes sorted by importance
  const importantNodes = sortByImportance(nodes).slice(0, 20);
  const points = importantNodes.map((node, index) =>
    buildTimelinePoint({
      node,
      order: index + 1,
      fallbackLabelPrefix: 'Step',
      sourceMap,
    })
  );

  return {
    title: clean.title || 'Timeline',
    summary: clean.summary || '',
    points,
  };
}

/**
 * Build timeline from a sequence (can be timeline, process, or workflow)
 */
function buildTimelineFromSequences(sequences, nodeMap, document, sourceMap) {
  const points = [];

  const flattenedNodes = sequences.flatMap(seq => {
    const nodeIds = Array.isArray(seq?.nodeIds) ? seq.nodeIds : [];
    return nodeIds.map(nodeId => nodeMap[nodeId]).filter(Boolean);
  });

  const ordinalPrefix = inferOrdinalPrefix({
    sequences,
    nodes: flattenedNodes,
    document,
  });

  sequences.forEach(seq => {
    (seq.nodeIds || []).forEach((nodeId, index) => {
      const node = nodeMap[nodeId];
      if (node) {
        const order = points.length + 1;
        points.push(
          buildTimelinePoint({
            node,
            order,
            fallbackLabelPrefix: ordinalPrefix,
            sourceMap,
            fallbackTitle: `Step ${index + 1}`,
          })
        );
      }
    });
  });

  return {
    title: document.title || 'Timeline',
    summary: document.summary || '',
    points: points.sort((a, b) => a.order - b.order),
  };
}

function buildTimelinePoint({
  node = {},
  order = 1,
  fallbackLabelPrefix = 'Step',
  fallbackTitle = '',
  sourceMap = {},
} = {}) {
  const safeOrder = Number.isFinite(Number(order)) ? Number(order) : 1;
  const fallbackTimestamp = `${fallbackLabelPrefix} ${safeOrder}`;
  const rawTimestamp = getDisplayTimestamp(node?.time);
  const timestamp = rawTimestamp || fallbackTimestamp;
  const title = (typeof node?.label === 'string' && node.label.trim())
    ? node.label.trim()
    : (fallbackTitle || `${fallbackLabelPrefix} ${safeOrder}`);
  const id = (typeof node?.id === 'string' && node.id.trim())
    ? `timeline-${node.id}`
    : `timeline-point-${safeOrder}`;

  return {
    id,
    nodeId: node.id,
    title,
    // Keep legacy label for backward compatibility with older renderers.
    label: title,
    description: node.summary || '',
    timestamp,
    order: safeOrder,
    importance: node.importance || 0.5,
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  };
}

function getDisplayTimestamp(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isValidTimestampString(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const looksIso =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed);
  return looksIso && !Number.isNaN(Date.parse(trimmed));
}

function inferOrdinalPrefix({ sequences = [], nodes = [], document = {} } = {}) {
  const typeCounts = nodes.reduce(
    (acc, node) => {
      const type = typeof node?.type === 'string' ? node.type.toLowerCase() : '';
      if (type === 'phase' || type === 'stage') acc.phase += 1;
      if (type === 'step' || type === 'action' || type === 'decision') acc.step += 1;
      return acc;
    },
    { step: 0, phase: 0 }
  );

  if (typeCounts.phase > typeCounts.step) return 'Phase';
  if (typeCounts.step > 0) return 'Step';

  const combinedText = [
    ...sequences.map(seq => seq?.label),
    document?.title,
    document?.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bphase(s)?\b/.test(combinedText)) return 'Phase';
  return 'Step';
}
