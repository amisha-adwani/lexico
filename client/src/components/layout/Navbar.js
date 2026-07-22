const actions = ['History', 'Templates', 'Settings'];

function Navbar() {
  return (
    <header className="flex items-center justify-between border-b border-ink-line px-10 py-5 md:px-5 md:py-4">
      <div className="flex items-center gap-3">
        <div className="mark flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-signal-500 font-display text-[17px] font-semibold text-paper-100">L</div>
        <div>
          <div className="brand-name font-display text-[17px] font-medium leading-none text-paper-100">Lexico AI</div>
          <div className="brand-tag mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper-inksoft">Adaptive visual learning</div>
        </div>
      </div>

      <nav className="flex gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-full border border-ink-line bg-transparent px-4 py-2 font-sans text-[13px] font-medium text-paper-100 transition-colors hover:border-signal-400 hover:bg-signal-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
          >
            {action}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default Navbar;
