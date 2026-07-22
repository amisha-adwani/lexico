import Navbar from './Navbar';

function AppLayout({ inputPanel, outputPanel }) {
  return (
    <div className="min-h-screen bg-ink-950 text-paper-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <Navbar />

      <main className="relative min-h-[calc(100vh-76px)] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section className="relative z-[1] flex flex-col bg-paper-100 px-12 py-14 text-paper-ink md:px-8 md:py-8">{inputPanel}</section>

        <div className="pointer-events-none absolute left-[calc(100%*(1/2.25)-70px)] top-[150px] z-[2] h-[220px] w-[140px] md:hidden" aria-hidden="true">
          <svg viewBox="0 0 140 220" className="h-full w-full overflow-visible">
            <line x1="6" y1="18" x2="60" y2="18" stroke="#2B2620" strokeWidth="2" opacity="0.35" />
            <line x1="6" y1="32" x2="52" y2="32" stroke="#2B2620" strokeWidth="2" opacity="0.28" />
            <line x1="6" y1="46" x2="58" y2="46" stroke="#2B2620" strokeWidth="2" opacity="0.2" />
            <path d="M58 18 C 90 18, 85 60, 118 60" stroke="#5E6AD2" strokeWidth="1.6" fill="none" opacity="0.9" />
            <path d="M52 32 C 88 32, 88 60, 118 60" stroke="#5E6AD2" strokeWidth="1.6" fill="none" opacity="0.7" />
            <path d="M58 46 C 90 46, 88 62, 118 62" stroke="#5E6AD2" strokeWidth="1.6" fill="none" opacity="0.5" />
            <circle cx="118" cy="60" r="7" fill="#5E6AD2" />
            <line x1="118" y1="60" x2="118" y2="110" stroke="#5E6AD2" strokeWidth="1.6" opacity="0.8" />
            <line x1="118" y1="60" x2="92" y2="128" stroke="#5E6AD2" strokeWidth="1.6" opacity="0.8" />
            <line x1="118" y1="60" x2="140" y2="132" stroke="#5E6AD2" strokeWidth="1.6" opacity="0.8" />
            <circle cx="118" cy="110" r="5" fill="#7C86DE" />
            <circle cx="92" cy="128" r="5" fill="#7C86DE" />
            <circle cx="140" cy="132" r="5" fill="#7C86DE" />
          </svg>
        </div>

        <section className="flex flex-col bg-ink-950 px-12 py-14 md:px-8 md:py-8">{outputPanel}</section>
      </main>

      <section className="border-t border-ink-line bg-ink-950 px-12 py-16 md:px-8 md:py-12">
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <p className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.14em] text-paper-inksoft">The process</p>
          <h2 className="mb-2 font-display text-[clamp(22px,2.6vw,28px)] font-medium text-paper-100">Three steps, one map</h2>
          <p className="text-[14.5px] leading-6 text-paper-inksoft">No setup, no separate tool to learn — the same workspace above carries you from raw notes to a finished view.</p>
        </div>
        <div className="mx-auto grid max-w-[960px] gap-7 md:grid-cols-3">
          <div className="relative pt-4">
            <span className="absolute left-0 top-0 h-px w-9 bg-signal-500" />
            <p className="mb-[14px] font-display text-[34px] font-medium leading-none text-ink-line">01</p>
            <h3 className="mb-2 text-[16px] font-semibold text-paper-100">Bring your material</h3>
            <p className="text-[13.5px] leading-6 text-paper-inksoft">Paste text directly, or drop in a PDF, DOCX, or TXT file — lecture notes, research papers, meeting transcripts, anything dense.</p>
          </div>
          <div className="relative pt-4">
            <span className="absolute left-0 top-0 h-px w-9 bg-signal-500" />
            <p className="mb-[14px] font-display text-[34px] font-medium leading-none text-ink-line">02</p>
            <h3 className="mb-2 text-[16px] font-semibold text-paper-100">Choose how to see it</h3>
            <p className="text-[13.5px] leading-6 text-paper-inksoft">Pick the shape that fits your content — a mindmap for branching ideas, a timeline for sequence, a flow for process, or let Lexico choose for you.</p>
          </div>
          <div className="relative pt-4">
            <span className="absolute left-0 top-0 h-px w-9 bg-signal-500" />
            <p className="mb-[14px] font-display text-[34px] font-medium leading-none text-ink-line">03</p>
            <h3 className="mb-2 text-[16px] font-semibold text-paper-100">Explore and switch</h3>
            <p className="text-[13.5px] leading-6 text-paper-inksoft">Your map renders in the workspace. Switch views anytime to see the same material from a different angle, without starting over.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-line bg-ink-900 px-12 py-16 md:px-8 md:py-12">
        <div className="mx-auto mb-10 max-w-[640px] text-center">
          <p className="mb-[18px] font-mono text-[11px] uppercase tracking-[0.14em] text-paper-inksoft">Output types</p>
          <h2 className="mb-2 font-display text-[clamp(22px,2.6vw,28px)] font-medium text-paper-100">One source, every shape</h2>
          <p className="text-[14.5px] leading-6 text-paper-inksoft">Different material calls for different structure. Lexico can render your source as any of these, or pick automatically.</p>
        </div>
        <div className="mx-auto grid max-w-[1080px] gap-4 md:grid-cols-3">
          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <circle cx="45" cy="35" r="7" fill="#5E6AD2" stroke="none" />
                <line x1="45" y1="35" x2="14" y2="14" /><circle cx="14" cy="14" r="4" fill="#191921" />
                <line x1="45" y1="35" x2="14" y2="56" /><circle cx="14" cy="56" r="4" fill="#191921" />
                <line x1="45" y1="35" x2="76" y2="14" /><circle cx="76" cy="14" r="4" fill="#191921" />
                <line x1="45" y1="35" x2="76" y2="56" /><circle cx="76" cy="56" r="4" fill="#191921" />
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Mindmap</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">Branching ideas radiating from one central concept — good for brainstorms and broad topics.</p>
          </div>

          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <line x1="10" y1="35" x2="80" y2="35" />
                <circle cx="22" cy="35" r="4" fill="#5E6AD2" stroke="none" />
                <circle cx="45" cy="35" r="4" fill="#5E6AD2" stroke="none" />
                <circle cx="68" cy="35" r="4" fill="#5E6AD2" stroke="none" />
                <line x1="22" y1="35" x2="22" y2="20" strokeDasharray="2 2" />
                <line x1="45" y1="35" x2="45" y2="50" strokeDasharray="2 2" />
                <line x1="68" y1="35" x2="68" y2="20" strokeDasharray="2 2" />
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Timeline</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">Events placed along a single line — good for history, project phases, or anything ordered by time.</p>
          </div>

          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <rect x="8" y="28" width="20" height="14" rx="2" />
                <rect x="38" y="28" width="20" height="14" rx="2" />
                <rect x="68" y="28" width="14" height="14" rx="2" fill="#5E6AD2" stroke="none" />
                <line x1="28" y1="35" x2="38" y2="35" markerEnd="url(#a1)" />
                <line x1="58" y1="35" x2="68" y2="35" markerEnd="url(#a1)" />
                <defs><marker id="a1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7C86DE" /></marker></defs>
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Flow</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">Steps and decisions connected in sequence — good for processes, workflows, and cause and effect.</p>
          </div>

          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <circle cx="45" cy="12" r="4" fill="#5E6AD2" stroke="none" />
                <line x1="45" y1="16" x2="45" y2="26" />
                <line x1="45" y1="26" x2="20" y2="40" /><line x1="45" y1="26" x2="70" y2="40" />
                <circle cx="20" cy="44" r="4" /><circle cx="70" cy="44" r="4" />
                <line x1="20" y1="48" x2="10" y2="60" /><line x1="20" y1="48" x2="30" y2="60" />
                <circle cx="10" cy="63" r="3" /><circle cx="30" cy="63" r="3" />
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Concept tree</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">A hierarchy branching from general to specific — good for taxonomies and nested topics.</p>
          </div>

          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <rect x="10" y="14" width="70" height="42" rx="2" />
                <line x1="10" y1="28" x2="80" y2="28" /><line x1="10" y1="42" x2="80" y2="42" />
                <line x1="34" y1="14" x2="34" y2="56" /><line x1="58" y1="14" x2="58" y2="56" />
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Table</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">Rows and columns of structured facts — good for specs, comparisons of many attributes, and data.</p>
          </div>

          <div className="rounded-md border border-ink-line bg-ink-950 p-5 transition-colors hover:border-signal-400">
            <div className="mb-4 flex h-[84px] w-full items-center justify-center">
              <svg width="90" height="70" viewBox="0 0 90 70" fill="none" stroke="#7C86DE" strokeWidth="1.6">
                <path d="M45 10 L49 22 L61 22 L51 30 L55 42 L45 35 L35 42 L39 30 L29 22 L41 22 Z" fill="#5E6AD2" stroke="none" />
                <line x1="14" y1="55" x2="76" y2="55" strokeDasharray="2 2" />
              </svg>
            </div>
            <h3 className="mb-1.5 text-[14.5px] font-semibold text-paper-100">Smart view</h3>
            <p className="text-[12.5px] leading-[1.55] text-paper-inksoft">Lexico reads your material and recommends the shape most likely to make it click.</p>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950 px-12 py-7 text-center text-[12.5px] text-paper-inksoft md:px-8">Lexico AI — adaptive visual learning.</footer>
    </div>
  );
}

export default AppLayout;
