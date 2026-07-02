/**
 * View Recommendation Engine
 *
 * Ranks visualization types for a Canonical IR and returns the best recommendation.
 *
 * The visualization suitability engine computes scores for each supported view.
 * This module:
 * - ranks the views,
 * - computes recommendation confidence,
 * - validates the selected view,
 * - returns the recommended view with ranking metadata.
 *
 * Supported views:
 * - mindmap
 * - timeline
 * - flow
 * - comparison
 * - table
 * - conceptTree
 * - generic
 */

import { scoreDocumentSuitability } from "./visualizationSuitability.js";

const VALID_VIEWS = new Set([
  "mindmap",
  "timeline",
  "flow",
  "comparison",
  "table",
  "conceptTree",
  "generic",
]);

export default function recommendViewType(canonicalIR) {
  const { profile, scores } = scoreDocumentSuitability(canonicalIR || {});

  const rankedViews = Object.entries(scores)
    .sort(([, leftScore], [, rightScore]) => rightScore - leftScore)
    .map(([view, score]) => ({ view, score }));

  const recommendedView = rankedViews[0]?.view ?? "generic";
  const topScore = rankedViews[0]?.score ?? 0;
  const secondScore = rankedViews[1]?.score ?? 0;
  const confidence =
    topScore === 0
      ? 0
      : Number((topScore / (topScore + secondScore)).toFixed(2));
  const reasons = [];
  if (profile.isProceduralDocument) {
    reasons.push("Contains ordered process steps");
  }

  if (profile.isChronologicalDocument) {
    reasons.push("Contains chronological events");
  }

  if (profile.isComparisonDocument) {
    reasons.push("Contains comparable entities");
  }

  if (profile.isHierarchicalDocument) {
    reasons.push("Contains hierarchical relationships");
  }

  if (profile.isConceptualDocument) {
    reasons.push("Contains interconnected concepts");
  }

  const finalRecommendedView = VALID_VIEWS.has(recommendedView)
    ? recommendedView
    : "generic";

  return {
    recommendedView: finalRecommendedView,
    confidence,
    rankedViews,
    reasons,
  };
}
