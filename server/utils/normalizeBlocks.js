export default function normalizeBlocks(candidate) {
    if (!Array.isArray(candidate)) return [];
  
    const cleanArray = (value) =>
      Array.isArray(value)
        ? value
            .filter((item) => typeof item === "string" && item.trim())
            .map((item) => item.trim())
        : [];
  
    const cleanPoints = (value) =>
      Array.isArray(value)
        ? value
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label.trim() : "",
              time: typeof item.time === "string" ? item.time.trim() : "",
              desc: typeof item.desc === "string" ? item.desc.trim() : "",
            }))
            .filter((item) => item.label || item.time || item.desc)
        : [];
  
    const cleanNodes = (value) =>
      Array.isArray(value)
        ? value
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label.trim() : "",
              children: cleanArray(item.children),
            }))
            .filter((item) => item.label)
        : [];
  
    const cleanComparisonItems = (value) =>
      Array.isArray(value)
        ? value
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label.trim() : "",
              points: cleanArray(item.points),
            }))
            .filter((item) => item.label || item.points.length > 0)
        : [];
  
    const cleanRows = (value) =>
      Array.isArray(value)
        ? value
            .filter((row) => Array.isArray(row))
            .map((row) =>
              row
                .filter((col) => typeof col === "string" && col.trim())
                .map((col) => col.trim())
            )
            .filter((row) => row.length > 0)
        : [];
  
    return candidate
      .filter((block) => block && typeof block === "object")
      .map((block) => {
        const type = typeof block.type === "string" && block.type.trim()
          ? block.type.trim()
          : "text";
        const normalizedType = type.toLowerCase();
  
        const title = typeof block.title === "string" ? block.title.trim() : "";
        const content = typeof block.content === "string" ? block.content.trim() : "";
        const legacyFlow = normalizedType === "flow" || normalizedType === "steps" || normalizedType === "process";
        const legacyComparison =
          normalizedType === "comparison" || normalizedType === "compare" || normalizedType === "contrast";
        const isVisual = normalizedType === "visual" || legacyFlow || legacyComparison;
  
        const normalized = { type: isVisual ? "visual" : type };
  
        if (title) normalized.title = title;
        if (content) normalized.content = content;
  
        if (isVisual) {
          const allowedVisualTypes = new Set(["flow", "timeline", "mindmap", "comparison", "table"]);
          const requestedVisualType = typeof block.visualType === "string" ? block.visualType.trim().toLowerCase() : "";
          const visualType = allowedVisualTypes.has(requestedVisualType)
            ? requestedVisualType
            : legacyFlow
              ? "flow"
              : legacyComparison
                ? "comparison"
                : "";
  
          if (visualType) {
            normalized.visualType = visualType;
          }
  
          if (visualType === "flow") {
            const steps = cleanArray(block.steps ?? block.extra);
            if (steps.length > 0) normalized.steps = steps;
          }
  
          if (visualType === "timeline") {
            const points = cleanPoints(block.points);
            if (points.length > 0) normalized.points = points;
          }
  
          if (visualType === "mindmap") {
            const nodes = cleanNodes(block.nodes);
            if (nodes.length > 0) normalized.nodes = nodes;
          }
  
          if (visualType === "comparison") {
            let items = cleanComparisonItems(block.items);
  
            if (!items.length && block.extra && typeof block.extra === "object" && !Array.isArray(block.extra)) {
              const source = block.extra;
              const leftTitle = typeof source.leftTitle === "string" ? source.leftTitle.trim() : "Left";
              const rightTitle = typeof source.rightTitle === "string" ? source.rightTitle.trim() : "Right";
              const left = cleanArray(source.left);
              const right = cleanArray(source.right);
  
              items = [
                { label: leftTitle || "Left", points: left },
                { label: rightTitle || "Right", points: right },
              ].filter((item) => item.label || item.points.length > 0);
            }
  
            if (items.length > 0) normalized.items = items;
          }
  
          if (visualType === "table") {
            const headers = cleanArray(block.headers);
            const rows = cleanRows(block.rows);
            if (headers.length > 0) normalized.headers = headers;
            if (rows.length > 0) normalized.rows = rows;
          }
        } else {
          const extra = cleanArray(block.extra);
          if (extra.length > 0) normalized.extra = extra;
        }
  
        return normalized;
      })
      .filter((block) => {
        if (block.content) return true;
        if (Array.isArray(block.extra) && block.extra.length > 0) return true;
        if (block.type?.toLowerCase() === "visual" && typeof block.visualType === "string") {
          if (Array.isArray(block.steps) && block.steps.length > 0) return true;
          if (Array.isArray(block.points) && block.points.length > 0) return true;
          if (Array.isArray(block.nodes) && block.nodes.length > 0) return true;
          if (Array.isArray(block.items) && block.items.length > 0) return true;
          if (
            (Array.isArray(block.headers) && block.headers.length > 0) ||
            (Array.isArray(block.rows) && block.rows.length > 0)
          ) {
            return true;
          }
        }
        if (
          block.type?.toLowerCase() === "comparison" &&
          block.extra &&
          (block.extra.left?.length > 0 || block.extra.right?.length > 0)
        ) {
          return true;
        }
        return false;
      });
  }
  