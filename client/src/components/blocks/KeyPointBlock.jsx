import ExplainMoreText from './ExplainMoreText';

function KeyPointBlock({ block }) {
  return (
    <article className="group rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-6 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">Key Point</p>
      <h3 className="mb-2 text-xl font-bold text-slate-900">{block.title || 'Most Important Takeaway'}</h3>
      <div className="text-base font-medium leading-7 text-slate-800">
        <ExplainMoreText text={block.content} previewChars={180} />
      </div>
    </article>
  );
}

export default KeyPointBlock;
