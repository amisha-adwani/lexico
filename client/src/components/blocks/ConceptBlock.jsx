import ExplainMoreText from './ExplainMoreText';

function ConceptBlock({ block }) {
  const title = block.title || 'Concept';
  const hasAnalogy =
    typeof block.content === 'string' && /analogy|like|similar to|imagine/i.test(block.content);

  return (
    <article className="group rounded-2xl border border-sky-100 bg-sky-50/70 p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-600">
        Concept
      </p>
      <h3 className="mb-2 text-base font-semibold text-slate-900">{title}</h3>
      <div className={hasAnalogy ? 'rounded-xl border border-sky-200/80 bg-white/80 p-3' : ''}>
        <ExplainMoreText text={block.content} previewChars={170} />
      </div>
      {hasAnalogy && (
        <p className="mt-2 text-xs font-medium italic text-sky-700">Includes analogy-style explanation</p>
      )}
    </article>
  );
}

export default ConceptBlock;
