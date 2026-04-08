function InputPanel({ value, onChange, onSimplify, isLoading }) {
  const isDisabled = isLoading || !value.trim();

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Input</h2>
        <p className="text-sm text-slate-500">
          Paste complex text and generate adaptive simplification blocks.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[280px] w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        placeholder="Paste complex text..."
      />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSimplify}
          disabled={isDisabled}
          className="rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Analyzing...' : 'Simplify with AI'}
        </button>
      </div>
    </div>
  );
}

export default InputPanel;
