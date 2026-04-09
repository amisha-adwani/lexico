import BulletBlock from '../blocks/BulletBlock.jsx';
import ConceptBlock from '../blocks/ConceptBlock.jsx';
import ExampleBlock from '../blocks/ExampleBlock.jsx';
import GenericBlock from '../blocks/GenericBlock';
import KeyPointBlock from '../blocks/KeyPointBlock.jsx';
import WarningBlock from '../blocks/WarningBlock.jsx';
import VisualBlock from '../blocks/VisualBlock.jsx';

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

function BlockRenderer({ block }) {
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
