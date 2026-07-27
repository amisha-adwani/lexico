import React, { useState } from "react";
import NodeCard, { getSurfaceStyle } from "./shared/NodeCard";

export default function ConceptTreeRenderer({ viewModel = {} }) {
  const { label, summary, root } = viewModel;
  const surfaceStyle = getSurfaceStyle();

  if (!root) {
    return (
      <div
        className="rounded-2xl border border-slate-800/80 px-5 py-4 text-sm text-slate-400 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.85)]"
        style={surfaceStyle}
      >
        No concept tree data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {label ? <h2 className="text-xl font-semibold tracking-tight text-slate-100">{label}</h2> : null}
      {summary ? <p className="text-sm leading-6 text-slate-400">{summary}</p> : null}

      <div
        className="rounded-2xl border border-slate-800/80 p-4 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.85)]"
        style={surfaceStyle}
      >
        <TreeNode node={root} depth={0} />
      </div>
    </div>
  );
}

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const children = node.children || [];

  return (
    <div className={depth === 0 ? "" : "ml-6"}>
      <div className="flex items-center gap-2">
        {children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-slate-400 transition-colors duration-200 hover:text-slate-200"
          >
            {expanded ? "-" : "+"}
          </button>
        ) : null}

        <NodeCard
          label={node.label}
          icon={node.icon}
          depth={depth}
          isRoot={depth === 0}
          className="justify-start"
        />
      </div>

      {expanded && children.length > 0 ? (
        <div className="ml-5 mt-3 space-y-2 border-l-2 border-slate-700/70 pl-4">
          {children.map((child) => (
            <TreeNode
              key={child.id || child.nodeId || child.label}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
