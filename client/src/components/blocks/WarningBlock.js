import ExplainMoreText from './ExplainMoreText';

function WarningBlock({ block }) {
  return (
    <article className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-soft">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" role="img" aria-label="warning">
          ⚠️
        </span>
        <h3 className="text-base font-semibold text-amber-900">
          {block.title || 'Important Warning'}
        </h3>
      </div>
      <ExplainMoreText text={block.content} previewChars={200} />
    </article>
  );
}

export default WarningBlock;
