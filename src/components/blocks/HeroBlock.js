import ExplainMoreText from './ExplainMoreText';

function HeroBlock({ block }) {
  return (
    <article className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-sky-50 p-5 shadow-soft">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Main Insight
      </p>
      <h3 className="mb-2 text-xl font-semibold text-slate-900">
        {block.title || 'Key Point'}
      </h3>
      <ExplainMoreText text={block.content} previewChars={220} />
    </article>
  );
}

export default HeroBlock;
