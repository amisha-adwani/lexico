import React, { useMemo } from "react";
import { getSurfaceStyle } from "./shared/NodeCard";

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isValidTimestampString(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const looksIso =
    /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed);
  return looksIso && !Number.isNaN(Date.parse(trimmed));
}

function formatTemporalLabel(timestamp, order) {
  if (isValidTimestampString(timestamp)) {
    return timestamp.trim();
  }
  if (typeof timestamp === "string" && timestamp.trim()) {
    return timestamp.trim();
  }
  return `Step ${order}`;
}

function getConnectorGap(currentPoint, nextPoint) {
  if (!currentPoint || !nextPoint) return 0;

  if (currentPoint.hasRealTimestamp && nextPoint.hasRealTimestamp) {
    const deltaDays = Math.max(1, (nextPoint.timestampMs - currentPoint.timestampMs) / DAY_MS);
    return Math.round(clamp(32 + Math.log10(deltaDays + 1) * 46, 28, 110));
  }

  return 42;
}

function TimelineCard({ point }) {
  return (
    <article className="rounded-2xl border border-slate-800/80 bg-slate-900/75 p-4 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.95)] backdrop-blur-sm">
      <h3 className="text-base font-semibold leading-6 text-slate-100">{point.title}</h3>
      {point.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{point.description}</p> : null}
    </article>
  );
}

export default function TimelineRenderer({ viewModel = {} }) {
  const title = viewModel.title || viewModel.label || "";
  const summary = viewModel.summary || "";
  const rawPoints = Array.isArray(viewModel.points) ? viewModel.points : [];
  const surfaceStyle = useMemo(() => getSurfaceStyle(), []);

  const points = useMemo(() => {
    const normalized = rawPoints.map((point, index) => {
      const rawOrder = Number(point?.order);
      const order = Number.isFinite(rawOrder) ? Math.max(1, rawOrder) : index + 1;
      const timestamp = typeof point?.timestamp === "string" ? point.timestamp.trim() : "";
      const hasRealTimestamp = isValidTimestampString(timestamp);
      const timestampMs = hasRealTimestamp ? Date.parse(timestamp) : Number.NaN;
      const temporalLabel = formatTemporalLabel(timestamp, order);

      return {
        id: point?.id || point?.nodeId || `timeline-point-${order}`,
        title: point?.title || point?.label || `Step ${order}`,
        description: point?.description || "",
        timestamp,
        temporalLabel,
        order,
        hasRealTimestamp,
        timestampMs,
      };
    });

    const sorted = normalized.sort((a, b) => {
      if (a.hasRealTimestamp && b.hasRealTimestamp) {
        if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
      }
      return a.order - b.order;
    });

    return sorted.map((point, index) => {
      const nextPoint = sorted[index + 1];
      return {
        ...point,
        connectorGap: getConnectorGap(point, nextPoint),
      };
    });
  }, [rawPoints]);

  if (!points.length) {
    return (
      <div
        className="rounded-2xl border border-slate-800/80 px-5 py-4 text-sm text-slate-400 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.85)]"
        style={surfaceStyle}
      >
        No timeline data available
      </div>
    );
  }

  const shouldAlternate = points.length >= 4;

  return (
    <div className="space-y-6">
      <style>
        {`
          @keyframes timelineFadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes timelineConnectorPulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.7; }
          }
        `}
      </style>

      {(title || summary) && (
        <div>
          {title ? <h2 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h2> : null}
          {summary ? <p className="mt-2 text-sm leading-6 text-slate-400">{summary}</p> : null}
        </div>
      )}

      <section
        className="relative overflow-hidden rounded-2xl border border-slate-800/80 p-5 shadow-[0_22px_64px_-30px_rgba(15,23,42,0.9)]"
        style={surfaceStyle}
      >
        <div className="pointer-events-none absolute bottom-6 left-5 top-6 w-px bg-slate-700/80 md:left-1/2 md:-translate-x-1/2" />

        <div className="space-y-0 md:hidden">
          {points.map((point, index) => {
            const hasNext = index < points.length - 1;
            return (
              <div
                key={point.id}
                className="relative pl-12"
                style={{
                  paddingBottom: hasNext ? `${point.connectorGap}px` : 0,
                  animation: "timelineFadeInUp 440ms ease-out both",
                  animationDelay: `${index * 70}ms`,
                }}
              >
                <div className="absolute bottom-0 left-5 top-1 flex -translate-x-1/2 flex-col items-center">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-300/80 bg-slate-950 shadow-[0_0_0_4px_rgba(6,182,212,0.16)]" />
                  {hasNext ? (
                    <span
                      className="mt-2 w-px flex-1 bg-cyan-300/40"
                      style={{
                        animation: "timelineConnectorPulse 1800ms ease-in-out infinite",
                        animationDelay: `${index * 120}ms`,
                      }}
                    />
                  ) : null}
                </div>

                <p className="mb-2 text-xs font-medium tracking-wide text-cyan-200">{point.temporalLabel}</p>
                <TimelineCard point={point} />
              </div>
            );
          })}
        </div>

        <div className="hidden md:block">
          {points.map((point, index) => {
            const hasNext = index < points.length - 1;
            const isLeft = shouldAlternate ? index % 2 === 0 : false;
            return (
              <div
                key={point.id}
                className="relative grid grid-cols-[1fr_88px_1fr] gap-x-7"
                style={{
                  paddingBottom: hasNext ? `${point.connectorGap}px` : 0,
                  animation: "timelineFadeInUp 460ms ease-out both",
                  animationDelay: `${index * 85}ms`,
                }}
              >
                <div className="col-start-1">{isLeft ? <TimelineCard point={point} /> : <div />}</div>

                <div className="col-start-2 flex h-full flex-col items-center">
                  <span className={`mb-3 text-xs font-medium tracking-wide text-cyan-200 ${isLeft ? "self-end pr-1 text-right" : "self-start pl-1 text-left"}`}>
                    {point.temporalLabel}
                  </span>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-cyan-300/80 bg-slate-950 shadow-[0_0_0_4px_rgba(6,182,212,0.16)]" />
                  {hasNext ? (
                    <span
                      className="mt-2 w-px flex-1 bg-cyan-300/40"
                      style={{
                        animation: "timelineConnectorPulse 1900ms ease-in-out infinite",
                        animationDelay: `${index * 120}ms`,
                      }}
                    />
                  ) : null}
                </div>

                <div className="col-start-3">
                  {!isLeft ? <TimelineCard point={point} /> : <div />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
