import BulletBlock from '../blocks/BulletBlock';
import FlowBlock from '../blocks/FlowBlock';
import GenericBlock from '../blocks/GenericBlock';
import HeroBlock from '../blocks/HeroBlock';
import TextBlock from '../blocks/TextBlock';
import WarningBlock from '../blocks/WarningBlock';

export function getBlockKind(type = '') {
  const normalized = type.toLowerCase();
  if (['key_point', 'hero', 'main_insight'].includes(normalized)) return 'hero';
  if (['warning', 'alert', 'risk'].includes(normalized)) return 'warning';
  if (['bullet', 'list'].includes(normalized)) return 'bullet';
  if (['flow', 'steps', 'process'].includes(normalized)) return 'flow';
  if (['text', 'paragraph', 'context'].includes(normalized)) return 'text';
  return 'generic';
}

function BlockRenderer({ block }) {
  const kind = getBlockKind(block.type);

  switch (kind) {
    case 'hero':
      return <HeroBlock block={block} />;
    case 'warning':
      return <WarningBlock block={block} />;
    case 'bullet':
      return <BulletBlock block={block} />;
    case 'flow':
      return <FlowBlock block={block} />;
    case 'text':
      return <TextBlock block={block} />;
    default:
      return <GenericBlock block={block} />;
  }
}

export default BlockRenderer;
