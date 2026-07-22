import React from 'react'
import {
  MindmapRenderer,
  TimelineRenderer,
  FlowRenderer,
  ComparisonRenderer,
  TableRenderer,
  ConceptTreeRenderer,
  GenericRenderer,
} from './index'

/**
 * Centralized ViewRenderer
 * Props: { viewType: string, viewModel: any }
 */
export default function ViewRenderer({ viewType, viewModel }) {
  switch (viewType) {
    case 'mindmap':
      return <MindmapRenderer viewModel={viewModel} />
    case 'timeline':
      return <TimelineRenderer viewModel={viewModel} />
    case 'flow':
      return <FlowRenderer viewModel={viewModel} />
    case 'comparison':
      return <ComparisonRenderer viewModel={viewModel} />
    case 'table':
      return <TableRenderer viewModel={viewModel} />
    case 'conceptTree':
    case 'concept-tree':
      return <ConceptTreeRenderer viewModel={viewModel} />
    case 'generic':
      return <GenericRenderer viewModel={viewModel} />
    default:
      // Fallback for unsupported view types
      return (
        <div style={{padding:12,border:'1px solid #eee'}}>
          <strong>Unsupported view type:</strong> {String(viewType)}
          <div style={{marginTop:8}}>
            <GenericRenderer viewModel={viewModel} unsupportedType={viewType} />
          </div>
        </div>
      )
  }
}
