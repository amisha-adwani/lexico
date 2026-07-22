import { useRef, useState } from 'react';

function InputPanel({ value, onChange, selectedFile, onFileSelect, onSimplify, isLoading }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasText = Boolean(value.trim());
  const hasFile = Boolean(selectedFile);
  const isDisabled = isLoading || (!hasText && !hasFile);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] || null;
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <p className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.14em] text-paper-inksoft">From dense text to clear structure</p>
      <h1 className="mb-4 max-w-[11ch] font-display text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.12] tracking-[-0.01em] text-paper-ink">Read less. Understand more.</h1>
      <p className="mb-8 max-w-[38ch] text-[16px] leading-6 text-paper-inksoft">Paste your notes or drop in a document, and Lexico redraws it as a map you can actually follow.</p>

      <div className="mb-2.5 flex items-baseline justify-between text-[13px] font-medium text-paper-ink">
        <span>Source material</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-amber">{isLoading ? 'Generating' : 'Ready to explore'}</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste lectures, notes, research, or long-form writing…"
        className="mb-5 min-h-[150px] w-full resize-y rounded-sm border border-paper-line bg-[#fbf8f1] p-4 font-sans text-[14.5px] leading-6 text-paper-ink placeholder:text-paper-inksoft/70 focus:outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-100"
      />

      <div
        className={`mb-6 flex items-center justify-between gap-4 rounded-sm border border-dashed px-[18px] py-4 transition-colors ${isDragging ? 'border-signal-500 bg-signal-500/5 shadow-[inset_0_0_0_1px_rgba(94,106,210,0.3)]' : 'border-paper-line hover:border-signal-500 hover:bg-signal-500/5'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div>
          <p className="mb-1 text-[14px] font-medium text-paper-ink">Drop in a PDF, DOCX, or TXT</p>
          <p className="m-0 text-[12.5px] text-paper-inksoft">Use this when your material already lives outside the editor.</p>
          {hasFile && <span className="mt-2 inline-block font-mono text-[11.5px] text-paper-inksoft">Selected: {selectedFile.name}</span>}
        </div>
        <button type="button" className="shrink-0 rounded-full border border-paper-ink bg-transparent px-4 py-[9px] text-[13px] font-medium text-paper-ink transition-colors hover:bg-paper-ink hover:text-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 disabled:cursor-not-allowed disabled:opacity-70" onClick={handleBrowseClick} disabled={isLoading}>
          Browse files
        </button>
        <input
          ref={fileInputRef}
          id="source-file"
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="sr-only"
          disabled={isLoading}
        />
      </div>

      {hasFile && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="font-mono text-[11.5px] text-paper-inksoft">Selected: {selectedFile.name}</span>
          <button type="button" onClick={handleRemoveFile} disabled={isLoading} className="border-none bg-transparent p-0 text-[12px] text-paper-inksoft transition-colors hover:text-paper-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 disabled:cursor-not-allowed disabled:opacity-70">
            Remove file
          </button>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-paper-line pt-5">
        <p className="m-0 max-w-[26ch] text-[13px] text-paper-inksoft">Pick a view on the right, then generate to see it take shape.</p>
        <button type="button" onClick={onSimplify} disabled={isDisabled} className="whitespace-nowrap rounded-full bg-signal-500 px-6 py-[13px] font-sans text-[14px] font-semibold text-white transition-colors hover:bg-[#4e5ac4] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100 disabled:cursor-not-allowed disabled:opacity-70">
          {isLoading ? 'Generating…' : 'Generate visualization'}
        </button>
      </div>
    </div>
  );
}

export default InputPanel;
