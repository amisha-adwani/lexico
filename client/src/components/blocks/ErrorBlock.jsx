function ErrorBlock({ message }) {
  return (
    <article className="rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-soft transition duration-300">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Error</p>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Block could not be generated</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-red-700">{message}</p>
      </div>
    </article>
  );
}

export default ErrorBlock;