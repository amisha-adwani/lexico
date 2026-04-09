function FlowBlock({ data }) {
  const steps = Array.isArray(data?.steps)
    ? data.steps
    : Array.isArray(data?.extra)
      ? data.extra
      : [];

  return (
    <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">Flow</p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{data?.title || 'Process Flow'}</h3>

      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-max items-center gap-2">
          {steps.map((step, index) => (
            <div key={`${step}-${index}`} className="flex items-center gap-2">
              <div className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition duration-300 hover:border-cyan-400 hover:bg-cyan-50">
                {step}
              </div>
              {index < steps.length - 1 && (
                <span className="px-1 text-cyan-500" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default FlowBlock;
