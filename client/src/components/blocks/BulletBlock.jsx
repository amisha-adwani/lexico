function BulletBlock({ block }) {
  const items = Array.isArray(block.extra) ? block.extra : [];

  return (
    <article className="group rounded-2xl border border-purple-100 bg-purple-50/60 p-5 shadow-soft transition duration-200 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">Bullet List</p>
      <h3 className="mb-3 text-base font-semibold text-slate-900">{block.title || 'Key details'}</h3>

      <ul className="space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 h-2 w-2 rounded-full bg-purple-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default BulletBlock;
