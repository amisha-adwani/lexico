import React from 'react'
import ViewRenderer from './components/viewRenderers/ViewRenderer'

export default function ViewRendererExample() {
  const sampleViewModel = {
    title: 'Sample View',
    nodes: [{ id: 1, text: 'Root' }, { id: 2, text: 'Child' }],
  }

  return (
    <div style={{padding:16}}>
      <h3>ViewRenderer Example</h3>
      <div style={{marginBottom:12}}>
        <strong>Mindmap:</strong>
        <ViewRenderer viewType="mindmap" viewModel={sampleViewModel} />
      </div>

      <div style={{marginBottom:12}}>
        <strong>Timeline:</strong>
        <ViewRenderer viewType="timeline" viewModel={{events:[{id:1,label:'Event'}]}} />
      </div>

      <div style={{marginBottom:12}}>
        <strong>Unsupported:</strong>
        <ViewRenderer viewType="unknown-type" viewModel={{}} />
      </div>
    </div>
  )
}
