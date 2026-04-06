import ExplainMoreText from './ExplainMoreText';

function GenericBlock({ block }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {block.type || 'unknown'}
      </p>
      <h3 className="mb-2 text-sm font-semibold text-slate-800">
        {block.title || 'Additional Context'}
      </h3>
      <ExplainMoreText
        text={
          block.content ||
          (Array.isArray(block.extra) ? block.extra.join(', ') : 'No content available.')
        }
      />
    </article>
  );
}

export default GenericBlock;
