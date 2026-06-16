
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

  const normalizedViewType = (typeof viewType === 'string' ? viewType.toLowerCase() : VIEW_TYPES.GENERIC);

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

    case VIEW_TYPES.CONCEPT_TREE:
      return toConceptTreeViewModel(canonicalIR);

    case VIEW_TYPES.GENERIC:
    default:
      return toGenericViewModel(canonicalIR);
  }
}

export default transformCanonicalIR;
