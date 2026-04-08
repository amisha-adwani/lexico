import ExplainMoreText from './ExplainMoreText';

function TextBlock({ block }) {
  return (
    <article className="py-1">
      {block.title && (
        <h3 className="mb-1 text-sm font-semibold text-slate-800">{block.title}</h3>
      )}
      <ExplainMoreText text={block.content} previewChars={160} />
    </article>
  );
}

export default TextBlock;
