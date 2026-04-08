function BulletBlock({ block }) {
  const items = Array.isArray(block.items)
    ? block.items
    : Array.isArray(block.extra)
      ? block.extra
      : [];

  return (
    <article className="px-1 py-2">
      {block.title && (
        <h3 className="mb-2 text-sm font-semibold text-slate-800">{block.title}</h3>
      )}
      <ul className="space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default BulletBlock;
