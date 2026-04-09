import ExplainMoreText from './ExplainMoreText';

function WarningBlock({ block }) {
  return (
    <article className="group rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-soft transition duration-200 hover:shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" role="img" aria-label="warning">
          ⚠️
        </span>
        <h3 className="text-base font-semibold text-amber-900">{block.title || 'Important warning'}</h3>
      </div>
      <div className="text-amber-900/90">
        <ExplainMoreText text={block.content} previewChars={170} />
      </div>
    </article>
  );
}

export default WarningBlock;
