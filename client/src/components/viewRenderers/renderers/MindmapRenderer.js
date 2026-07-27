import React, { useMemo, useEffect, useRef, useState } from "react";
import NodeCard, { getSurfaceStyle } from "./shared/NodeCard";

const LAYOUT_CONSTANTS = {
  horizontalSpacing: 210,
  verticalSpacing: 72,
  subtreePadding: 28,
  minNodeWidth: 132,
  minNodeHeight: 48,
};

const VIEWPORT_PADDING = 80;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.2;

function estimateNodeSize(node) {
  const label = String(node.label || "Untitled");
  const citationCount = Array.isArray(node.citations) ? node.citations.length : 0;
  const width = Math.max(
    LAYOUT_CONSTANTS.minNodeWidth,
    Math.min(260, 24 + Math.max(12, label.length) * 8 + citationCount * 12),
  );
  const height = Math.max(LAYOUT_CONSTANTS.minNodeHeight, 38 + (citationCount > 0 ? 8 : 0));

  return { width, height };
}

function measureSubtree(node) {
  const children = Array.isArray(node.children) ? node.children : [];
  const nodeSize = estimateNodeSize(node);

  if (!children.length) {
    return {
      nodeSize,
      height: nodeSize.height + LAYOUT_CONSTANTS.subtreePadding * 2,
      childMeasures: [],
    };
  }

  const childMeasures = children.map(measureSubtree);
  const totalChildHeight = childMeasures.reduce((sum, child) => sum + child.height, 0)
    + LAYOUT_CONSTANTS.verticalSpacing * Math.max(0, childMeasures.length - 1);

  return {
    nodeSize,
    height: Math.max(
      nodeSize.height + LAYOUT_CONSTANTS.subtreePadding * 2,
      totalChildHeight + LAYOUT_CONSTANTS.subtreePadding * 2,
    ),
    childMeasures,
  };
}

function layoutSubtree(node, x, y, depth, measure, parentId = null) {
  const children = Array.isArray(node.children) ? node.children : [];
  const layoutNode = {
    id: node.nodeId || node.id || `${depth}-${node.label || "node"}`,
    parentId,
    node,
    x,
    y,
    depth,
    size: measure.nodeSize,
  };

  if (!children.length) {
    return { root: layoutNode, nodes: [layoutNode] };
  }

  const childMeasures = measure.childMeasures || [];
  const totalChildHeight = childMeasures.reduce((sum, child) => sum + child.height, 0)
    + LAYOUT_CONSTANTS.verticalSpacing * Math.max(0, childMeasures.length - 1);
  const startY = y - totalChildHeight / 2;

  const childLayouts = children.map((child, index) => {
    const childMeasure = childMeasures[index];
    const childHeight = childMeasure?.height || LAYOUT_CONSTANTS.minNodeHeight;
    const childY = startY + childHeight / 2 + index * (childHeight + LAYOUT_CONSTANTS.verticalSpacing);
    const direction = depth === 0 ? (index % 2 === 0 ? 1 : -1) : 1;
    const childX = x + direction * (LAYOUT_CONSTANTS.horizontalSpacing * (1 + depth * 0.3));
    return layoutSubtree(child, childX, childY, depth + 1, childMeasure, layoutNode.id);
  });

  const allNodes = [layoutNode, ...childLayouts.flatMap((entry) => entry.nodes)];
  return { root: layoutNode, nodes: allNodes };
}

function buildLayout(rootNode) {
  const measure = measureSubtree(rootNode);
  const layout = layoutSubtree(rootNode, 0, 0, 0, measure, null);
  const allNodes = layout.nodes;

  const bounds = allNodes.reduce((acc, entry) => {
    const left = entry.x - entry.size.width / 2;
    const right = entry.x + entry.size.width / 2;
    const top = entry.y - entry.size.height / 2;
    const bottom = entry.y + entry.size.height / 2;

    return {
      minX: Math.min(acc.minX, left),
      maxX: Math.max(acc.maxX, right),
      minY: Math.min(acc.minY, top),
      maxY: Math.max(acc.maxY, bottom),
    };
  }, {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });

  const width = Math.max(900, Math.ceil(bounds.maxX - bounds.minX + 320));
  const height = Math.max(700, Math.ceil(bounds.maxY - bounds.minY + 260));
  const offsetX = width / 2 - (bounds.maxX + bounds.minX) / 2;
  const offsetY = 140 - bounds.minY;

  return {
    width,
    height,
    offsetX,
    offsetY,
    nodes: allNodes.map((entry) => ({
      ...entry,
      displayX: entry.x + offsetX,
      displayY: entry.y + offsetY,
    })),
  };
}

function buildConnectorPath(parentNode, childNode) {
  const parentCenterX = parentNode.displayX;
  const parentCenterY = parentNode.displayY;
  const childCenterX = childNode.displayX;
  const childCenterY = childNode.displayY;
  const horizontalDirection = childCenterX >= parentCenterX ? 1 : -1;

  const startX = parentCenterX + (horizontalDirection > 0 ? parentNode.size.width / 2 : -parentNode.size.width / 2);
  const startY = parentCenterY;
  const endX = childCenterX - (horizontalDirection > 0 ? childNode.size.width / 2 : -childNode.size.width / 2);
  const endY = childCenterY;
  const elbowX = startX + (horizontalDirection > 0 ? 24 : -24);

  return `M ${startX} ${startY} L ${elbowX} ${startY} L ${elbowX} ${endY} L ${endX} ${endY}`;
}

function getViewportBounds(nodes = []) {
  if (!nodes.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  return nodes.reduce((bounds, entry) => {
    const left = entry.displayX - entry.size.width / 2;
    const right = entry.displayX + entry.size.width / 2;
    const top = entry.displayY - entry.size.height / 2;
    const bottom = entry.displayY + entry.size.height / 2;

    return {
      minX: Math.min(bounds.minX, left),
      maxX: Math.max(bounds.maxX, right),
      minY: Math.min(bounds.minY, top),
      maxY: Math.max(bounds.maxY, bottom),
    };
  }, {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function getFitViewport(nodes = [], containerWidth, containerHeight) {
  const bounds = getViewportBounds(nodes);
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    (containerWidth - VIEWPORT_PADDING * 2) / contentWidth,
    (containerHeight - VIEWPORT_PADDING * 2) / contentHeight,
    1.2,
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const panX = containerWidth / 2 - centerX * scale;
  const panY = containerHeight / 2 - centerY * scale;

  return {
    scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
    panX,
    panY,
  };
}

export default function MindmapRenderer({ viewModel = {} }) {
  const { label, summary, nodes = [] } = viewModel;
  const containerRef = useRef(null);
  const [viewport, setViewport] = useState({ scale: 1, panX: 0, panY: 0 });
  const [containerSize, setContainerSize] = useState({ width: 960, height: 720 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const surfaceStyle = useMemo(() => getSurfaceStyle(), []);

  const layout = useMemo(() => {
    const rootNode = Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null;
    if (!rootNode) {
      return null;
    }

    return buildLayout(rootNode);
  }, [nodes]);

  useEffect(() => {
    if (!containerRef.current || !layout) {
      return undefined;
    }

    const updateSize = () => {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: Math.max(320, rect.width || 960),
        height: Math.max(320, rect.height || 720),
      });
    };

    updateSize();
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateSize)
      : null;

    if (resizeObserver) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateSize);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateSize);
    };
  }, [layout]);

  useEffect(() => {
    if (!layout) {
      return;
    }

    setViewport(getFitViewport(layout.nodes, containerSize.width, containerSize.height));
  }, [layout, containerSize.width, containerSize.height]);

  const handleWheel = (event) => {
    event.preventDefault();
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * zoomFactor));
    const worldX = (mouseX - viewport.panX) / viewport.scale;
    const worldY = (mouseY - viewport.panY) / viewport.scale;

    setViewport({
      scale: nextScale,
      panX: mouseX - worldX * nextScale,
      panY: mouseY - worldY * nextScale,
    });
  };

  const handlePointerDown = (event) => {
    if (!containerRef.current) {
      return;
    }

    setIsDragging(true);
    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.style.cursor = "grabbing";
  };

  const handlePointerMove = (event) => {
    if (!isDragging || !containerRef.current) {
      return;
    }

    const deltaX = event.clientX - dragOriginRef.current.x;
    const deltaY = event.clientY - dragOriginRef.current.y;
    dragOriginRef.current = { x: event.clientX, y: event.clientY };

    setViewport(current => ({
      ...current,
      panX: current.panX + deltaX,
      panY: current.panY + deltaY,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }
  };

  if (!layout) {
    return (
      <div
        className="rounded-2xl border border-slate-800/80 px-5 py-4 text-sm text-slate-400 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.85)]"
        style={surfaceStyle}
      >
        No mindmap data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {label ? <h2 className="text-xl font-semibold tracking-tight text-slate-100">{label}</h2> : null}
      {summary ? <p className="text-sm leading-6 text-slate-400">{summary}</p> : null}

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-slate-800/80 p-4 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.85)]"
        style={{ minHeight: 560, height: "min(78vh, 860px)", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        <div className="absolute inset-0" style={surfaceStyle} />
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute inset-0 pointer-events-none"
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            {layout.nodes.slice(1).map((childNode, index) => {
              const parentNode = layout.nodes.find((entry) => entry.id === childNode.parentId) || layout.nodes[0];
              return (
                <path
                  key={`connector-${childNode.id || index}`}
                  d={buildConnectorPath(parentNode, childNode)}
                  stroke="rgba(148, 163, 184, 0.4)"
                  strokeWidth="1.3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>

          {layout.nodes.map((entry) => {
            return (
              <NodeCard
                key={entry.id}
                label={entry.node.label || "Untitled"}
                icon={entry.node.icon}
                depth={entry.depth || 0}
                isRoot={(entry.depth || 0) === 0}
                className="absolute min-w-0 max-w-none select-none"
                style={{
                  left: entry.displayX - entry.size.width / 2,
                  top: entry.displayY - entry.size.height / 2,
                  width: entry.size.width,
                  minHeight: entry.size.height,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
