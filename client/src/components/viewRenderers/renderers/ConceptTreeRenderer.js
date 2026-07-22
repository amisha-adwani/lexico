import React, { useState } from 'react';

export default function ConceptTreeRenderer({ viewModel = {} }) {
  const { label, summary, root } = viewModel;

  if (!root) {
    return (
      <div className="text-gray-500">
        No concept tree data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {label && (
        <h2 className="text-xl font-bold">
          {label}
        </h2>
      )}

      {summary && (
        <p className="text-gray-600">
          {summary}
        </p>
      )}

      <TreeNode node={root} />
    </div>
  );
}

function TreeNode({ node }) {
  const [expanded, setExpanded] = useState(true);

  const children = node.children || [];

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2">
        {children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {expanded ? '−' : '+'}
          </button>
        )}

        <div className="rounded border border-gray-200 bg-white px-3 py-1">
          {node.label}
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="ml-6 mt-3 border-l-2 border-gray-200 pl-4 space-y-2">
          {children.map((child) => (
            <TreeNode
              key={child.id || child.nodeId || child.label}
              node={child}
            />
          ))}
        </div>
      )}
    </div>
  );
}