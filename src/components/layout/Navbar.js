const actions = [
  { label: 'History' },
  { label: 'Templates' },
];

function Navbar() {
  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-sky-500 shadow-soft" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Lexico AI</p>
            <p className="text-xs text-slate-500">Text Simplification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
