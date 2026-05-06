// ─── Config ───────────────────────────────────────────
const COLORS = {
  primary: '#7dd3fc',
  secondary: '#bfdbfe',
  text: '#1e293b',
  textLight: '#334155',
  bg: '#f0f9ff',
  bgLight: '#ffffff',
  line: '#93c5fd',
};

// ─── Flow SVG ─────────────────────────────────────────
/** Render a flow/steps block as an SVG string */
export function renderFlowAsSvgString(data) {
  const steps = data.steps || [];
  const width = 600;
  const boxH = 48;
  const gap = 32;
  const height = steps.length * (boxH + gap) + gap;
  const cx = width / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="white"/>`;

  steps.forEach((step, i) => {
    const y = gap + i * (boxH + gap);
    svg += `<rect x="${cx - 160}" y="${y}" width="320" height="${boxH}" rx="10"
      fill="${COLORS.bg}" stroke="${COLORS.primary}" stroke-width="1.5"/>`;
    svg += `<text x="${cx}" y="${y + boxH / 2 + 5}" text-anchor="middle"
      font-size="13" fill="${COLORS.text}" font-weight="500">${escapeXml(step)}</text>`;
    if (i < steps.length - 1) {
      const arrowY = y + boxH;
      svg += `<line x1="${cx}" y1="${arrowY}" x2="${cx}" y2="${arrowY + gap - 4}"
        stroke="${COLORS.line}" stroke-width="2"/>`;
      svg += `<polygon points="${cx - 6},${arrowY + gap - 4} ${cx + 6},${arrowY + gap - 4} ${cx},${arrowY + gap + 4}"
        fill="${COLORS.line}"/>`;
    }
  });

  svg += '</svg>';
  return svg;
}

// ─── Timeline SVG ─────────────────────────────────────
/** Render a timeline block as an SVG string */
export function renderTimelineAsSvgString(data) {
  const points = data.points || [];
  const width = 640;
  const rowH = 70;
  const height = points.length * rowH + 60;
  const lineX = 100;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="white"/>`;

  // Vertical line
  svg += `<line x1="${lineX}" y1="30" x2="${lineX}" y2="${height - 30}"
    stroke="${COLORS.secondary}" stroke-width="2"/>`;

  points.forEach((point, i) => {
    const y = 40 + i * rowH;
    // Dot
    svg += `<circle cx="${lineX}" cy="${y}" r="7"
      fill="${COLORS.primary}" stroke="white" stroke-width="2"/>`;
    // Time label
    svg += `<text x="${lineX - 14}" y="${y + 4}" text-anchor="end"
      font-size="11" fill="${COLORS.line}" font-weight="600">${escapeXml(point.time || '')}</text>`;
    // Event label
    svg += `<text x="${lineX + 20}" y="${y - 6}" font-size="13"
      fill="${COLORS.text}" font-weight="600">${escapeXml(point.label || '')}</text>`;
    // Description
    if (point.desc) {
      svg += `<text x="${lineX + 20}" y="${y + 12}" font-size="11"
        fill="${COLORS.textLight}">${escapeXml(point.desc.slice(0, 70))}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
}

// ─── Comparison SVG ───────────────────────────────────
/** Render a comparison block as an SVG string */
export function renderComparisonAsSvgString(data) {
  const items = data.items || [];
  const width = 640;
  const colW = (width - 60) / items.length;
  const rowH = 28;
  const maxPoints = Math.max(...items.map(i => i.points?.length || 0));
  const height = maxPoints * rowH + 120;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="white"/>`;

  items.forEach((item, i) => {
    const x = 30 + i * colW;
    // Column header
    svg += `<rect x="${x}" y="20" width="${colW - 10}" height="36" rx="8"
      fill="${COLORS.bg}" stroke="${COLORS.primary}" stroke-width="1.5"/>`;
    svg += `<text x="${x + (colW - 10) / 2}" y="44" text-anchor="middle"
      font-size="13" fill="${COLORS.text}" font-weight="600">${escapeXml(item.label || '')}</text>`;
    // Points
    (item.points || []).forEach((point, j) => {
      const y = 80 + j * rowH;
      svg += `<circle cx="${x + 10}" cy="${y}" r="3" fill="${COLORS.primary}"/>`;
      svg += `<text x="${x + 20}" y="${y + 4}" font-size="11"
        fill="${COLORS.textLight}">${escapeXml(point.slice(0, 40))}</text>`;
    });
  });

  svg += '</svg>';
  return svg;
}

// ─── Router ───────────────────────────────────────────
/** Route to the correct SVG renderer based on visualType */
export function renderVisualAsSvgString(data) {
  switch (data?.visualType) {
    case 'flow': return renderFlowAsSvgString(data);
    case 'timeline': return renderTimelineAsSvgString(data);
    case 'comparison': return renderComparisonAsSvgString(data);
    default: return null;
  }
}

function escapeXml(str = '') {
  return String(str).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;'
  }[c]));
}