function TimelineBlock({ data }) {
  const points = Array.isArray(data?.points) ? data.points : [];

  return (
    <article className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">Timeline</p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{data?.title || 'Timeline Overview'}</h3>

      <ol className="space-y-3">
        {points.map((point, index) => (
          <li
            key={`${point.label || 'event'}-${index}`}
            className="rounded-xl border border-indigo-200 bg-white p-3 transition duration-300 hover:border-indigo-300"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">{point.label || `Event ${index + 1}`}</p>
              {point.time && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {point.time}
                </span>
              )}
            </div>
            {point.desc && <p className="text-sm text-slate-700">{point.desc}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}

export default TimelineBlock;
