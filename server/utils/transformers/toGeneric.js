import { createViewNode } from './utils.js';

export default function toGenericViewModel(canonicalIR) {
  const {
    document = {},
    nodes = [],
    relations = [],
    sequences = [],
    comparisons = [],
    sourceMap = {},
  } = canonicalIR;

  return {
    title: document.title || 'Untitled Document',
    document: {
      schemaVersion: document.schemaVersion,
      title: document.title,
      summary: document.summary,
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
