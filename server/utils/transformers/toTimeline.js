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
    return buildTimelineFromSequences(timelineSequences, nodeMap, document, sourceMap);
  }

  // FALLBACK B: Use process/workflow sequences
  const processSequences = sequences.filter(s => s.type === 'process' || s.type === 'workflow');
  if (processSequences.length > 0) {
    return buildTimelineFromSequences(processSequences, nodeMap, document, sourceMap);
  }

  // FALLBACK C: Use nodes with timestamps
  const timedNodes = nodes
    .filter(n => n.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
  
  if (timedNodes.length > 0) {
    const points = timedNodes.map((node, index) => ({
      nodeId: node.id,
      label: node.label || `Event ${index + 1}`,
      timestamp: node.time,
      description: node.summary || '',
      importance: node.importance || 0.5,
      order: index,
      sourceRefs: node.sourceRefs || [],
      citations: extractSourceCitations(node, sourceMap),
    }));

    return {
      title: clean.title || 'Timeline',
      summary: clean.summary || '',
      points,
    };
  }

  // FALLBACK D: Use important nodes sorted by importance
  const importantNodes = sortByImportance(nodes).slice(0, 20);
  const points = importantNodes.map((node, index) => ({
    nodeId: node.id,
    label: node.label || `Step ${index + 1}`,
    timestamp: node.time || undefined,
    description: node.summary || '',
    importance: node.importance || 0.5,
    order: index,
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

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

  sequences.forEach(seq => {
    (seq.nodeIds || []).forEach((nodeId, index) => {
      const node = nodeMap[nodeId];
      if (node) { 
        points.push({
          nodeId: node.id,
          label: node.label || `Step ${index + 1}`,
          timestamp: node.time || undefined,
          description: node.summary || '',
          importance: node.importance || 0.5,
          order: points.length, // Use global order across all sequences
          sourceRefs: node.sourceRefs || [],
          citations: extractSourceCitations(node, sourceMap),
        });
      }
    });
  });

  return {
    title: document.title || 'Timeline',
    summary: document.summary || '',
    points: points.sort((a, b) => a.order - b.order),
  };
}