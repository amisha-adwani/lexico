import { useMemo, useState } from 'react';

function ExplainMoreText({ text, previewChars = 180 }) {
  const [expanded, setExpanded] = useState(false);

  const shouldCollapse = text && text.length > previewChars;
  const preview = useMemo(() => {
    if (!shouldCollapse || expanded) {
      return text;
    }
    return `${text.slice(0, previewChars).trim()}...`;
  }, [expanded, previewChars, shouldCollapse, text]);

  if (!text) {
    return null;
  }

  return (
    <div>
      <p className="text-sm leading-6 text-slate-700">{preview}</p>
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((state) => !state)}
          className="mt-2 text-xs font-semibold text-brand-600 transition hover:text-brand-500"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}

export default ExplainMoreText;
