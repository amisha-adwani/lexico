import { createViewNode } from './utils.js';
import { cleanDocument } from '../visualizationSuitability.js';

export default function toGenericViewModel(canonicalIR) {
  const {
    document = {},
    nodes = [],
    relations = [],
    sequences = [],
    comparisons = [],
    sourceMap = {},
  } = canonicalIR;
  const clean = cleanDocument(document);

  return {
    title: clean.title || 'Untitled Document',
    document: {
      schemaVersion: document.schemaVersion,
      title: clean.title,
      summary: clean.summary,
      language: document.language,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
    nodeCount: nodes.length,
    relationCount: relations.length,
    sequenceCount: sequences.length,
    comparisonCount: comparisons.length,
    nodes: nodes.map(n => createViewNode(n, sourceMap)).slice(0, 50),
    relations: relations.slice(0, 50),
    sequences,
    comparisons,
  };
}
