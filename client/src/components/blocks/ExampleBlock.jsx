import ExplainMoreText from './ExplainMoreText';

function ExampleBlock({ block }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-soft transition duration-200 hover:shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Example</p>
      <h3 className="mb-2 text-base font-semibold text-slate-900">{block.title || 'Real-world scenario'}</h3>
      <div className="italic text-slate-700">
        <ExplainMoreText text={block.content} previewChars={190} />
      </div>
    </article>
  );
}

export default ExampleBlock;
