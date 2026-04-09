import ExplainMoreText from './ExplainMoreText';

function GenericBlock({ block }) {
  const fallbackText = Array.isArray(block.extra)
    ? block.extra.join(', ')
    : block.extra && typeof block.extra === 'object'
      ? JSON.stringify(block.extra)
      : 'No content available.';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:shadow-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {block.type || 'unknown'}
      </p>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">
        {block.title || 'Additional Context'}
      </h3>
      <ExplainMoreText text={block.content || fallbackText} />
    </article>
  );
}

export default GenericBlock;
