import ComparisonBlock from './ComparisonBlock.jsx';
import FlowBlock from './FlowBlock.jsx';
import MindMapBlock from './MindMapBlock.jsx';
import TableBlock from './TableBlock.jsx';
import TimelineBlock from './TimelineBlock.jsx';
import GenericBlock from './GenericBlock';

function VisualBlock({ data }) {
  const visualType = typeof data?.visualType === 'string' ? data.visualType.toLowerCase() : '';

  switch (visualType) {
    case 'flow':
      return <FlowBlock data={data} />;
    case 'timeline':
      return <TimelineBlock data={data} />;
    case 'mindmap':
      return <MindMapBlock data={data} />;
    case 'comparison':
      return <ComparisonBlock data={data} />;
    case 'table':
      return <TableBlock data={data} />;
    default:
      return <GenericBlock block={data} />;
  }
}

export default VisualBlock;
