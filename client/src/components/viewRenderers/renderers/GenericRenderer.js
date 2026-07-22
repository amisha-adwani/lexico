import React, { useState } from 'react';

export default function GenericRenderer({ viewModel = {} }) {
  const {
    title,
    document = {},
    nodeCount = 0,
    relationCount = 0,
    sequenceCount = 0,
    comparisonCount = 0,
    nodes = [],
    relations = [],
  } = viewModel;

  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">
          {title || 'Document'}
        </h2>

        {document.summary && (
          <p className="mt-2 text-gray-600">
            {document.summary}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Nodes" value={nodeCount} />
        <StatCard label="Relations" value={relationCount} />
        <StatCard label="Sequences" value={sequenceCount} />
        <StatCard label="Comparisons" value={comparisonCount} />
      </div>

      {/* Key Nodes */}
      <div>
        <h3 className="mb-3 text-lg font-medium">
          Key Concepts
        </h3>

        <div className="space-y-3">
          {nodes.slice(0, 10).map((node) => (
            <div
              key={node.nodeId || node.id}
              className="rounded-lg border p-3"
            >
              <div className="font-medium">
                {node.label}
              </div>

              {node.summary && (
                <div className="mt-1 text-sm text-gray-600">
                  {node.summary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Relations */}
      {relations.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-medium">
            Relationships
          </h3>

          <div className="space-y-2">
            {relations.slice(0, 10).map((relation, index) => (
              <div
                key={index}
                className="rounded border bg-gray-50 px-3 py-2 text-sm"
              >
                {relation.sourceNodeId} → {relation.relationType} → {relation.targetNodeId}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug View */}
      <div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          {showRaw ? 'Hide Raw Data' : 'Show Raw Data'}
        </button>

        {showRaw && (
          <pre className="mt-4 overflow-auto rounded-lg bg-gray-100 p-4 text-xs">
            {JSON.stringify(viewModel, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className="text-2xl font-bold">
        {value}
      </div>
      <div className="mt-1 text-sm text-gray-500">
        {label}
      </div>
    </div>
  );
}