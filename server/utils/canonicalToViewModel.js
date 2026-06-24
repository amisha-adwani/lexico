
import toMindmapViewModel from './transformers/toMindMap.js';
import toTimelineViewModel from './transformers/toTimeline.js';
import toFlowViewModel from './transformers/toFlow.js';
import toTableViewModel from './transformers/toTable.js';
import toComparisonViewModel from './transformers/toComparison.js';
import toConceptTreeViewModel from './transformers/toConceptTree.js';
import toGenericViewModel from './transformers/toGeneric.js';

// VIEW TYPE CONSTANTS

export const VIEW_TYPES = {
  MINDMAP: 'mindmap',
  TIMELINE: 'timeline',
  FLOW: 'flow',
  TABLE: 'table',
  COMPARISON: 'comparison',
  CONCEPT_TREE: 'conceptTree',
  GENERIC: 'generic',
};

export function transformCanonicalIR(canonicalIR, viewType = VIEW_TYPES.GENERIC) {
  if (!canonicalIR || typeof canonicalIR !== 'object') {
    throw new Error('canonicalIR must be a valid object');
  }

  const normalizedViewType = (typeof viewType === 'string' ? viewType.toLowerCase() : VIEW_TYPES.GENERIC.toLowerCase());

  switch (normalizedViewType) {
    case VIEW_TYPES.MINDMAP:
      return toMindmapViewModel(canonicalIR);

    case VIEW_TYPES.TIMELINE:
      return toTimelineViewModel(canonicalIR);

    case VIEW_TYPES.FLOW:
      return toFlowViewModel(canonicalIR);

    case VIEW_TYPES.TABLE:
      return toTableViewModel(canonicalIR);

    case VIEW_TYPES.COMPARISON:
      return toComparisonViewModel(canonicalIR);

    case VIEW_TYPES.CONCEPT_TREE.toLowerCase():
      return toConceptTreeViewModel(canonicalIR);

    case VIEW_TYPES.GENERIC:
    default:
      return toGenericViewModel(canonicalIR);
  }
}

function isViewModelObject(value) {
  return value && typeof value === 'object';
}

function countTreeNodes(root) {
  if (!root) return 0;
  let count = 0;
  function walk(node) {
    if (!node) return;
    count += 1;
    (node.children || node.points || node.steps || []).forEach(child => walk(child));
  }
  walk(root);
  return count;
}

export function isValidViewModel(viewType, model) {
  try {
    switch ((viewType || '').toLowerCase()) {
      case VIEW_TYPES.TIMELINE:
        {
          const points = Array.isArray(model.points) ? model.points.length : 0;
          const valid = points >= 2;
          const quality = valid ? Math.min(points / 10, 1) : 0;
          return { valid, qualityScore: quality, error: valid ? null : 'timeline requires at least 2 points' };
        }

      case VIEW_TYPES.COMPARISON:
        {
          const items = Array.isArray(model.items) ? model.items.length : 0;
          const valid = items >= 2;
          const quality = valid ? Math.min(items / 10, 1) : 0;
          return { valid, qualityScore: quality, error: valid ? null : 'comparison requires at least 2 items' };
        }

      case VIEW_TYPES.FLOW:
        {
          const stepCount =
            Array.isArray(model.steps)
              ? model.steps.length
              : Array.isArray(model.nodes)
                ? model.nodes.length
                : 0;
          const edges = Array.isArray(model.edges) ? model.edges.length : null;
          const valid = stepCount >= 3 && (edges === null || edges >= 2);
          const stepScore = Math.min(stepCount / 10, 1);
          const edgeScore = edges === null ? 1 : Math.min(edges / 5, 1);
          const quality = valid ? (stepScore * 0.7 + edgeScore * 0.3) : 0;
          return { valid, qualityScore: quality, error: valid ? null : 'flow requires >=3 steps/nodes and >=2 edges (if edges provided)' };
        }

      case VIEW_TYPES.MINDMAP:
        {
          const nodes = Array.isArray(model.nodes) ? (function count(nodesArr) {
            let c = 0;
            function walk(n) {
              if (!n) return;
              c += 1;
              (n.children || []).forEach(child => walk(child));
            }
            nodesArr.forEach(n => walk(n));
            return c;
          })(model.nodes) : 0;
          const valid = nodes >= 2;
          const quality = valid ? Math.min(nodes / 10, 1) : 0;
          return { valid, qualityScore: quality, error: valid ? null : 'mindmap requires at least 2 nodes' };
        }

      case VIEW_TYPES.CONCEPT_TREE.toLowerCase():
        {
          const root = model.root || model.nodes?.[0] || null;
          const nodes = root ? countTreeNodes(root) : 0;
          const valid = nodes >= 2;
          const quality = valid ? Math.min(nodes / 20, 1) : 0;
          return { valid, qualityScore: quality, error: valid ? null : 'conceptTree requires at least 2 nodes' };
        }

      case VIEW_TYPES.TABLE:
      case VIEW_TYPES.GENERIC:
      default:
        {
          const hasContent = Object.keys(model).length > 0;
          const quality = hasContent ? 1 : 0;
          return { valid: hasContent, qualityScore: quality, error: hasContent ? null : 'empty view model' };
        }
    }
  } catch (err) {
    return { valid: false, qualityScore: 0, error: `validation error: ${err?.message || String(err)}` };
  }
}

function safeTransform(canonicalIR, viewType) {
  try {
    const data = transformCanonicalIR(canonicalIR, viewType);

    if (!isViewModelObject(data)) {
      return {
        success: false,
        qualityScore: 0,
        error: `${viewType} transformer returned invalid view model`,
      };
    }

    const { valid, qualityScore, error } = isValidViewModel(viewType, data);

    if (!valid) {
      return {
        success: false,
        qualityScore: qualityScore || 0,
        error: error || `${viewType} failed quality validation`,
      };
    }

    return { success: true, qualityScore: qualityScore ?? 1, data };
  } catch (err) {
    return {
      success: false,
      qualityScore: 0,
      error: `${viewType} transformer failed${err?.message ? `: ${err.message}` : ''}`,
    };
  }
}

export function transformAndValidate(canonicalIR, viewType) {
  return safeTransform(canonicalIR, viewType);
}

export function transformAllViews(canonicalIR) {
  if (!canonicalIR || typeof canonicalIR !== 'object') {
    throw new Error('canonicalIR must be a valid object');
  }

  return {
    mindmap: transformAndValidate(canonicalIR, VIEW_TYPES.MINDMAP),
    timeline: transformAndValidate(canonicalIR, VIEW_TYPES.TIMELINE),
    flow: transformAndValidate(canonicalIR, VIEW_TYPES.FLOW),
    comparison: transformAndValidate(canonicalIR, VIEW_TYPES.COMPARISON),
    table: transformAndValidate(canonicalIR, VIEW_TYPES.TABLE),
    conceptTree: transformAndValidate(canonicalIR, VIEW_TYPES.CONCEPT_TREE),
    generic: transformAndValidate(canonicalIR, VIEW_TYPES.GENERIC),
  };
}

export default transformCanonicalIR;
