import React from "react";

export default function MindmapRenderer({ viewModel = {} }) {
  const { label, summary, nodes = [] } = viewModel;

  if (!nodes.length) {
    return (
      <div className="text-gray-500">
        No mindmap data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(label || summary) && (
        <div>
          {label && (
            <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
          )}

          {summary && <p className="mt-2 text-gray-600">{summary}</p>}
        </div>
      )}

      <div className="overflow-auto">
        {nodes.map((node) => (
          <MindmapNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

function MindmapNode({ node }) {
  const children = node.children || [];

  return (
    <div className="ml-4">
      <div className="inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 font-medium text-indigo-900">
        {node.label || 'Unlabeld'}
        {typeof node.importance === "number" && (
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
            {node.importance}
          </span>
        )}
      </div>
      {node.citations?.length > 0 && (
        <span className="ml-2 text-xs text-gray-500">
          ({node.citations.length} refs)
        </span>
      )}

      {children.length > 0 && (
        <div className="ml-6 mt-3 border-l-2 border-gray-200 pl-4 space-y-3">
          {children.map((child) => (
            <MindmapNode
              key={child.nodeId}
              node={child}
            />
          ))}
        </div>
      )}
    </div>
  );
}