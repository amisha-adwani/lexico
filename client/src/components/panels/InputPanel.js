function InputPanel({ value, onChange, selectedFile, onFileSelect, onSimplify, isLoading }) {
  const hasText = Boolean(value.trim());
  const hasFile = Boolean(selectedFile);
  const isDisabled = isLoading || (!hasText && !hasFile);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Input</h2>
        <p className="text-sm text-slate-500">
          Paste text or upload a PDF, TXT, or DOCX file.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[280px] w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
        placeholder="Paste complex text..."
      />

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label
          htmlFor="source-file"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Upload file (PDF, TXT, DOCX)
        </label>
        <input
          id="source-file"
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-300"
          disabled={isLoading}
        />
        <p className="mt-2 text-xs text-slate-500">
          {hasFile ? `Selected: ${selectedFile.name}` : 'No file selected'}
        </p>
      </div>

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
