import React from "react";

export function getNodeCardClasses(depth = 0, isRoot = false) {
  const baseClasses = "rounded-2xl border px-4 py-3 font-medium tracking-wide transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_16px_38px_-18px_rgba(99,102,241,0.45)]";

  if (isRoot || depth === 0) {
    return `${baseClasses} border-indigo-400/70 bg-slate-950/95 text-slate-50 shadow-[0_16px_40px_-20px_rgba(99,102,241,0.65)]`;
  }

  if (depth === 1) {
    return `${baseClasses} border-slate-700/80 bg-slate-900/90 text-slate-200 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.95)]`;
  }

  return `${baseClasses} border-slate-800/70 bg-slate-900/70 text-slate-300 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.9)]`;
}

export function getSurfaceStyle() {
  return {
    backgroundColor: "#0f1115",
    backgroundImage: "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
    backgroundSize: "24px 24px, 24px 24px",
  };
}

export default function NodeCard({ label, icon, depth = 0, isRoot = false, className = "", style = {}, ...props }) {
  return (
    <div
      className={`flex min-w-[9rem] max-w-[16rem] items-center justify-center gap-2 ${getNodeCardClasses(depth, isRoot)} ${className}`.trim()}
      style={style}
      {...props}
    >
      {icon ? <span className="text-sm leading-none">{icon}</span> : null}
      <div className="text-sm leading-5">{label || "Untitled"}</div>
    </div>
  );
}
