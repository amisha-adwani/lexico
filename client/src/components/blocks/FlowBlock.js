function FlowBlock({ block }) {
  const steps = Array.isArray(block.extra) ? block.extra : [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        {block.title || 'Flow'}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => (
          <div key={`${step}-${index}`} className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              {step}
            </div>
            {index < steps.length - 1 && (
              <span className="text-slate-400" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

export default FlowBlock;
