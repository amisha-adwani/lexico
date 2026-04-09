function Column({ title, items, tone }) {
  return (
    <div
      className={`rounded-xl border p-4 transition duration-300 hover:-translate-y-0.5 ${
        tone === 'left'
          ? 'border-slate-200 bg-slate-50'
          : 'border-emerald-200 bg-emerald-50/70'
      }`}
    >
      <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      <ul className="space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonBlock({ data }) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const legacy = data?.extra && typeof data.extra === 'object' ? data.extra : {};

  const leftItem = items[0];
  const rightItem = items[1];

  const leftTitle = leftItem?.label || legacy.leftTitle || 'Left';
  const rightTitle = rightItem?.label || legacy.rightTitle || 'Right';
  const left = Array.isArray(leftItem?.points) ? leftItem.points : Array.isArray(legacy.left) ? legacy.left : [];
  const right = Array.isArray(rightItem?.points)
    ? rightItem.points
    : Array.isArray(legacy.right)
      ? legacy.right
      : [];

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
        Comparison
      </p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">{data?.title || 'Side-by-side view'}</h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column title={leftTitle} items={left} tone="left" />
        <Column title={rightTitle} items={right} tone="right" />
      </div>
    </article>
  );
}

export default ComparisonBlock;
