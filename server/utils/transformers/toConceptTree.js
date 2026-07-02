import { sortByImportance, buildHierarchyTree } from './utils.js';
import { cleanDocument, isHierarchicalDocument } from '../visualizationSuitability.js';

export default function toConceptTreeViewModel(canonicalIR) {
  const { document = {}, nodes = [], relations = [], sourceMap = {} } = canonicalIR;
  const clean = cleanDocument(document);

  if (!nodes.length) {
    return {
      title: clean.title || 'Concept Tree',
      root: null,
    };
  }

  if (!isHierarchicalDocument(canonicalIR)) {
    return {
      title: clean.title || 'Concept Tree',
      summary: clean.summary || '',
      root: null,
    };
  }

  const rootNode = sortByImportance(nodes)[0];
  const root = buildHierarchyTree(rootNode, nodes, relations, sourceMap, 0, 5);

  return {
    title: clean.title || 'Concept Tree',
    summary: clean.summary || '',
    root,
  };
}
