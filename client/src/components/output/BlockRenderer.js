import BulletBlock from '../blocks/BulletBlock.jsx';
import ConceptBlock from '../blocks/ConceptBlock.jsx';
import ExampleBlock from '../blocks/ExampleBlock.jsx';
import GenericBlock from '../blocks/GenericBlock';
import KeyPointBlock from '../blocks/KeyPointBlock.jsx';
import WarningBlock from '../blocks/WarningBlock.jsx';
import VisualBlock from '../blocks/VisualBlock.jsx';
import ErrorBlock from '../blocks/ErrorBlock.jsx';

export function getBlockKind(type = '') {
  const normalized = type.toLowerCase();
  if (['key_point', 'hero', 'main_insight'].includes(normalized)) return 'key_point';
  if (['concept', 'idea', 'explanation'].includes(normalized)) return 'concept';
  if (['warning', 'alert', 'risk'].includes(normalized)) return 'warning';
  if (['bullet', 'bullets', 'list'].includes(normalized)) return 'bullet';
  if (['visual', 'flow', 'steps', 'process', 'comparison', 'compare', 'contrast'].includes(normalized)) {
    return 'visual';
  }
  if (['example', 'scenario', 'use_case'].includes(normalized)) return 'example';
  return 'generic';
}

function isValidBlock(block) {
  if (!block || typeof block !== 'object') return false;

  const kind = getBlockKind(block.type);

  if (kind === 'visual') {
    const visualType = block.visualType?.toLowerCase();
    if (visualType === 'mindmap') {
      return Array.isArray(block.nodes) && block.nodes.length >= 1 &&
             block.nodes.every(n => n.label && Array.isArray(n.children));
    }
    if (visualType === 'flow') {
      return Array.isArray(block.steps) && block.steps.length >= 2;
    }
    if (visualType === 'timeline') {
      return Array.isArray(block.points) && block.points.length >= 1;
    }
    if (visualType === 'comparison') {
      return Array.isArray(block.items) && block.items.length >= 2 &&
             block.items.every(i => i.label && Array.isArray(i.points));
    }
    return false;
  }

  // For other blocks, check if they have content
  return block.content || (Array.isArray(block.extra) && block.extra.length > 0) || block.title;
}

function BlockRenderer({ block }) {
  if (!isValidBlock(block)) {
    return <ErrorBlock message="This block is malformed or missing required data." />;
  }

  const kind = getBlockKind(block.type);

  switch (kind) {
    case 'key_point':
      return <KeyPointBlock block={block} />;
    case 'concept':
      return <ConceptBlock block={block} />;
    case 'warning':
      return <WarningBlock block={block} />;
    case 'bullet':
      return <BulletBlock block={block} />;
    case 'visual':
      return <VisualBlock data={block} />;
    case 'example':
      return <ExampleBlock block={block} />;
    default:
      return <GenericBlock block={block} />;
  }
}

export default BlockRenderer;
