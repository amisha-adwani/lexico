import React, { useMemo, useState, useEffect } from 'react';
import ViewRenderer from './ViewRenderer';

const VIEW_LABELS = {
  mindmap: 'Mindmap',
  timeline: 'Timeline',
  flow: 'Flow',
  comparison: 'Comparison',
  table: 'Table',
  conceptTree: 'Concept tree',
  concepttree: 'Concept tree',
  generic: 'Generic',
};

export default function ViewSwitcher({
  recommendedView,
  rankedViews = [],
  allViews,
  viewModel,
  isLoading = false,
  errorMessage = '',
}) {
  const availableViews = useMemo(() => {
    if (allViews) {
      return Object.entries(allViews)
        .filter(([, value]) => value?.success)
        .map(([key]) => key);
    }

    return recommendedView ? [recommendedView] : [];
  }, [allViews, recommendedView]);

  const initialView = recommendedView || availableViews[0] || 'generic';
  const [selectedView, setSelectedView] = useState(initialView);

  useEffect(() => {
    setSelectedView(initialView);
  }, [initialView]);

  const selectedViewModel = useMemo(() => {
    if (!allViews) {
      return viewModel;
    }

    const result = allViews[selectedView];

    if (!result?.success) {
      return null;
    }

    return result.data;
  }, [allViews, selectedView, viewModel]);

  const sortedViews =
    rankedViews?.length > 0
      ? rankedViews.filter((view) => availableViews.includes(view))
      : availableViews;

  const visibleViews = sortedViews.filter((view) => view !== 'generic');
  const shouldShowChips = visibleViews.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-[26px] flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper-inksoft">Workspace</span>
        {shouldShowChips && (
          <div className="flex flex-wrap gap-2">
            {visibleViews.map((view) => {
              const isSelected = view === selectedView;
              const isRecommended = view === recommendedView;
              const displayName = VIEW_LABELS[view] || view;

              return (
                <button
                  key={view}
                  type="button"
                  className={`flex items-center gap-[7px] rounded-full border px-4 py-[9px] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${isSelected ? 'border-signal-500 bg-signal-500 text-white' : 'border-ink-line bg-transparent text-paper-100 hover:border-signal-400 hover:bg-signal-500/10'}`}
                  onClick={() => setSelectedView(view)}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {displayName}
                  {isRecommended && <span className="ml-1 text-[10px] opacity-80">★</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="relative flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-md border border-ink-line p-10 text-center"
        style={{
          background: 'linear-gradient(#202029 1px, transparent 1px) 0 0 / 100% 28px, linear-gradient(90deg, #202029 1px, transparent 1px) 0 0 / 28px 100%, #191921',
        }}
      >
        {isLoading ? (
          <>
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ink-line">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F3EEE3" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 5v4M12 15v4M5 12h4M15 12h4" />
              </svg>
            </div>
            <h2 className="mb-2 mt-6 font-display text-[20px] font-medium text-paper-100">Generating your map</h2>
            <p className="m-0 max-w-[40ch] text-[13.5px] leading-6 text-paper-inksoft">Lexico is turning your source material into a structured view now.</p>
          </>
        ) : errorMessage ? (
          <>
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ink-line">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F3EEE3" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5" />
                <circle cx="12" cy="15.5" r="0.8" fill="#F3EEE3" stroke="none" />
              </svg>
            </div>
            <h2 className="mb-2 mt-6 font-display text-[20px] font-medium text-paper-100">We hit a snag</h2>
            <p className="m-0 max-w-[40ch] text-[13.5px] leading-6 text-paper-inksoft">{errorMessage}</p>
          </>
        ) : selectedViewModel ? (
          <div className="max-h-full w-full overflow-auto">
            <ViewRenderer viewType={selectedView} viewModel={selectedViewModel} />
          </div>
        ) : (
          <>
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ink-line">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F3EEE3" strokeWidth="1.5">
                <circle cx="12" cy="5" r="2.5" />
                <circle cx="5" cy="18" r="2.5" />
                <circle cx="19" cy="18" r="2.5" />
                <path d="M12 7.5V12M12 12L6.8 16M12 12L17.2 16" />
              </svg>
            </div>
            <h2 className="mb-2 mt-6 font-display text-[20px] font-medium text-paper-100">Your map will appear here</h2>
            <p className="m-0 max-w-[40ch] text-[13.5px] leading-6 text-paper-inksoft">Add source material and generate to see it rendered as a mindmap, timeline, flow, concept tree, table, or comparison.</p>
          </>
        )}
      </div>

      <p className="mt-[18px] text-center text-[12px] text-paper-inksoft">Switch views anytime after generating — <b className="font-medium text-paper-100">no need to start over.</b></p>
    </div>
  );
}