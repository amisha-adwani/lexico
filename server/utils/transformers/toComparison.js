import { sortByImportance, extractSourceCitations } from './utils.js';

export default function toComparisonViewModel(canonicalIR) {
  const { document, nodes = [], comparisons = [], relations = [], sourceMap = {} } = canonicalIR;

  if (!nodes || nodes.length === 0) {
    return {
      title: document.title || 'Comparison',
      summary: document.summary || '',
      items: [],
    };
  }

  // PRIORITY 1: Use existing canonical comparisons
  if (comparisons.length > 0) {
    return buildComparisonFromCanonical(comparisons, nodes, sourceMap);
  }

  // PRIORITY 2: Attempt to construct meaningful comparisons from relations
  const topNodes = sortByImportance(nodes).slice(0, 10);
  
  // Look for pairs of nodes with "compared_to" or similar relations
  const comparisonPairs = findComparisonPairs(topNodes, relations);
  if (comparisonPairs.length > 0) {
    return buildComparisonFromPairs(comparisonPairs, nodes, sourceMap);
  }

  // PRIORITY 3: Generate categories based on node types
  const typedComparison = generateTypedComparison(topNodes, sourceMap);
  if (typedComparison.items.length > 0) {
    return typedComparison;
  }

  // FALLBACK: Use top important nodes with their characteristics
  const items = topNodes.map(node => ({
    nodeId: node.id,
    label: node.label || 'Item',
    points: [
      { criterion: 'Type', value: node.type || 'concept' },
      { criterion: 'Importance', value: `${(node.importance || 0).toFixed(2)}` },
      { criterion: 'Description', value: (node.summary || '').substring(0, 50) },
    ],
    sourceRefs: node.sourceRefs || [],
    citations: extractSourceCitations(node, sourceMap),
  }));

  return {
    title: document.title || 'Comparison',
    summary: document.summary || '',
    items,
  };
}

/**
 * Build comparison from canonical IR comparisons
 */
function buildComparisonFromCanonical(comparisons, nodes, sourceMap) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const items = comparisons[0].items
    .map(item => {
      const node = nodeMap[item.itemId];
      // Normalize criteria to always be an array
      const criteria = Array.isArray(item.criteria)
        ? item.criteria
        : [];
      
      return {
        nodeId: item.itemId,
        label: node?.label || item.name || 'Item',
        points: criteria.map(crit => ({
          criterion: crit.criterion || 'Property',
          value: crit.value || '',
        })),
        sourceRefs: node?.sourceRefs || [],
        citations: node ? extractSourceCitations(node, sourceMap) : [],
      };
    })
    .filter(item => item.points.length > 0); // Only keep items with criteria

  return {
    title: comparisons[0].label || document.title || 'Comparison',
    summary: '',
    items: items.slice(0, 10),
  };
}

/**
 * Find pairs of nodes that should be compared
 */
function findComparisonPairs(nodes, relations = []) {
  const pairs = [];
  const nodeIds = new Set(nodes.map(n => n.id));
  
  relations.forEach(rel => {
    if (rel.relationType === 'compared_to' || rel.label?.toLowerCase().includes('vs')) {
      if (nodeIds.has(rel.sourceNodeId) && nodeIds.has(rel.targetNodeId)) {
        pairs.push({ nodeId1: rel.sourceNodeId, nodeId2: rel.targetNodeId });
      }
    }
  });
  
  return pairs;
}

/**
 * Build comparison from identified pairs
 */
function buildComparisonFromPairs(pairs, nodes, sourceMap) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  
  const items = pairs.slice(0, 8).flatMap(pair => {
    const node1 = nodeMap[pair.nodeId1];
    const node2 = nodeMap[pair.nodeId2];
    
    if (!node1 || !node2) return [];
    
    return [
      {
        nodeId: node1.id,
        label: node1.label,
        points: [
          { criterion: 'Type', value: node1.type || 'item' },
          { criterion: 'Importance', value: `${(node1.importance || 0).toFixed(2)}` },
        ],
        sourceRefs: node1.sourceRefs || [],
        citations: extractSourceCitations(node1, sourceMap),
      },
      {
        nodeId: node2.id,
        label: node2.label,
        points: [
          { criterion: 'Type', value: node2.type || 'item' },
          { criterion: 'Importance', value: `${(node2.importance || 0).toFixed(2)}` },
        ],
        sourceRefs: node2.sourceRefs || [],
        citations: extractSourceCitations(node2, sourceMap),
      },
    ];
  });

  return {
    title: 'Comparison',
    summary: '',
    items,
  };
}

/**
 * Generate a comparison by node type
 */
function generateTypedComparison(nodes, sourceMap) {
  const nodesByType = {};
  
  nodes.forEach(node => {
    const type = node.type || 'generic';
    if (!nodesByType[type]) {
      nodesByType[type] = [];
    }
    nodesByType[type].push(node);
  });
  
  // Only generate if we have at least 2 different types with multiple nodes
  const typesWithMultiple = Object.values(nodesByType).filter(arr => arr.length >= 2).length;
  
  if (typesWithMultiple < 2) {
    return { title: 'Comparison', summary: '', items: [] };
  }
  
  const items = [];
  Object.entries(nodesByType).forEach(([type, typeNodes]) => {
    if (typeNodes.length >= 2) {
      typeNodes.slice(0, 4).forEach(node => {
        items.push({
          nodeId: node.id,
          label: node.label,
          points: [
            { criterion: 'Category', value: type },
            { criterion: 'Importance', value: `${(node.importance || 0).toFixed(2)}` },
            { criterion: 'Summary', value: (node.summary || '').substring(0, 40) },
          ],
          sourceRefs: node.sourceRefs || [],
          citations: extractSourceCitations(node, sourceMap),
        });
      });
    }
  });
  
  return {
    title: 'Comparison by Type',
    summary: '',
    items: items.slice(0, 10),
  };
}
