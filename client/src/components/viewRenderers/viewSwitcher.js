import React, { useMemo, useState, useEffect } from 'react';
import ViewRenderer from './ViewRenderer';

const VIEW_LABELS = {
  mindmap: 'Mind Map',
  timeline: 'Timeline',
  flow: 'Flow',
  comparison: 'Comparison',
  table: 'Table',
  conceptTree: 'Concept Tree',
  generic: 'Generic',
};

export default function ViewSwitcher({
  recommendedView,
  rankedViews = [],
  allViews,
  viewModel,
}) {
  const availableViews = useMemo(() => {
    if (allViews) {
      return Object.entries(allViews)
        .filter(([, value]) => value?.success)
        .map(([key]) => key);
    }

    return recommendedView ? [recommendedView] : [];
  }, [allViews, recommendedView]);

  const initialView =
    recommendedView ||
    availableViews[0] ||
    'generic';

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

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      {sortedViews.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sortedViews.map((view) => {
            const isSelected = view === selectedView;
            const isRecommended = view === recommendedView;

            return (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`
                  rounded-lg px-4 py-2 text-sm font-medium transition
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {VIEW_LABELS[view] || view}

                {isRecommended && (
                  <span className="ml-2 text-xs opacity-80">
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Failed View */}
      {!selectedViewModel && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          Unable to render this view.
        </div>
      )}

      {/* Renderer */}
      {selectedViewModel && (
        <ViewRenderer
          viewType={selectedView}
          viewModel={selectedViewModel}
        />
      )}
    </div>
  );
}