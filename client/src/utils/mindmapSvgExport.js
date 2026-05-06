const CONFIG = {
  parentRadius: 240,
  childRadius: 160,
  padding: 180,
  rootCircleRadius: 40,
  parentEllipse: { rx: 75, ry: 32 },
  childEllipse: { rx: 58, ry: 24 },
  colors: {
    rootFill: '#f0f9ff',
    rootStroke: '#7dd3fc',
    parentFill: '#ffffff',
    parentStroke: '#7dd3fe',
    childFill: '#fbfbff',
    childStroke: '#e2e8f0',
    line: '#93c5fd',
    rootText: '#0f172a',
    parentText: '#1e293b',
    childText: '#334155',
  },
  text: {
    rootFontSize: 15,
    parentFontSize: 12,
    childFontSize: 10,
    rootMaxChars: 12,
    parentMaxChars: 14,
    childMaxChars: 12,
    lineHeight: 14,
  },
};

/** Split a label into multiple lines based on max characters per line. */
function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

/** Create a multiline SVG text block centered on the given position. */
function multiLineText(x, y, text, fontSize, fill, maxCharsPerLine, lineHeight = CONFIG.text.lineHeight) {
  const lines = wrapText(text, maxCharsPerLine);
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;
  const tspans = lines
    .map((line, i) =>
      `<tspan x="${x}" dy="${i === 0 ? startY - y : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}" fill="${fill}">${tspans}</text>`;
}

/** Escape XML special characters for SVG text content. */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'\"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&#39;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/** Calculate SVG canvas dimensions and center coordinates. */
function getCanvasSize(config) {
  const totalRadius = config.parentRadius + config.childRadius + config.padding;
  const width = totalRadius * 2;
  const height = totalRadius * 2;
  return { width, height, centerX: width / 2, centerY: height / 2 };
}

/** Convert polar coordinates to Cartesian coordinates. */
function getRadialPoint(cx, cy, angle, r) {
  return {
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r,
  };
}

/** Calculate the child angle along the parent spread range. */
function getChildAngle(parentAngle, total, index, spreadRange) {
  if (total === 1) {
    return parentAngle;
  }
  return parentAngle + (spreadRange / (total - 1)) * index - spreadRange / 2;
}

/** Return a reusable SVG defs section for filters or definitions. */
function svgDefs() {
  return `
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.12"/>
      </filter>
    </defs>`;
}

/** Build an SVG line element string. */
function svgLine(x1, y1, x2, y2, color) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2"/>`;
}

/** Build an SVG ellipse element string. */
function svgEllipse(cx, cy, rx, ry, fill, stroke, filter) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2"${filter ? ` filter="url(#${filter})"` : ''}/>`;
}

/** Build an SVG circle element string. */
function svgCircle(cx, cy, r, fill, stroke, filter) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"${filter ? ` filter="url(#${filter})"` : ''}/>`;
}

/** Build an SVG label element string using multiline text. */
function svgLabel(x, y, text, fontSize, fill, maxChars) {
  return multiLineText(x, y, text, fontSize, fill, maxChars);
}

/** Render the root node SVG and its label. */
function renderRoot(cx, cy, label, config) {
  const nodes = [];
  nodes.push(svgCircle(cx, cy, config.rootCircleRadius, config.colors.rootFill, config.colors.rootStroke));
  nodes.push(svgLabel(cx, cy, label, config.text.rootFontSize, config.colors.rootText, config.text.rootMaxChars));
  return { lines: '', nodes: nodes.join('') };
}

/** Render a parent node and the connecting line to the root. */
function renderParentNode(entry, parentIndex, centerX, centerY, config) {
  const parentAngle = (Math.PI * 2 * parentIndex) / (entry.totalParents || 1);
  const { x: parentX, y: parentY } = getRadialPoint(centerX, centerY, parentAngle, config.parentRadius);
  const nodes = [];
  nodes.push(svgEllipse(parentX, parentY, config.parentEllipse.rx, config.parentEllipse.ry, config.colors.parentFill, config.colors.parentStroke));
  nodes.push(svgLabel(parentX, parentY, entry.label, config.text.parentFontSize, config.colors.parentText, config.text.parentMaxChars));
  const lines = svgLine(centerX, centerY, parentX, parentY, config.colors.line);
  return { lines, nodes: nodes.join(''), parentX, parentY, parentAngle };
}

/** Render a child node and the connecting line to its parent. */
function renderChildNode(childLabel, parentX, parentY, parentAngle, childIndex, totalChildren, config) {
  const childAngle = getChildAngle(parentAngle, totalChildren, childIndex, Math.PI * 0.6);
  const { x: childX, y: childY } = getRadialPoint(parentX, parentY, childAngle, config.childRadius);
  const nodes = [];
  nodes.push(svgEllipse(childX, childY, config.childEllipse.rx, config.childEllipse.ry, config.colors.childFill, config.colors.childStroke));
  nodes.push(svgLabel(childX, childY, childLabel, config.text.childFontSize, config.colors.childText, config.text.childMaxChars));
  const lines = svgLine(parentX, parentY, childX, childY, config.colors.line);
  return { lines, nodes: nodes.join('') };
}

/** Render the full mindmap as an SVG string. */
function renderMindmapAsSvgString(data) {
  const { width, height, centerX, centerY } = getCanvasSize(CONFIG);
  const validParents = (data.nodes || []).filter(
    (entry) => entry && typeof entry.label === 'string' && Array.isArray(entry.children)
  );
  const svgParts = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`);
  svgParts.push(svgDefs());
  svgParts.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  const rootLabel = data.title || 'Main Topic';
  const rootRender = renderRoot(centerX, centerY, rootLabel, CONFIG);
  svgParts.push(rootRender.nodes);
  svgParts.push(rootRender.lines);
  validParents.forEach((entry, parentIndex) => {
    const parentEntry = { ...entry, totalParents: validParents.length };
    const parentRender = renderParentNode(parentEntry, parentIndex, centerX, centerY, CONFIG);
    svgParts.push(parentRender.nodes);
    svgParts.push(parentRender.lines);
    const childLabels = entry.children
      .filter((child) => typeof child === 'string' && child.trim())
      .map((child) => child.trim());
    childLabels.forEach((childLabel, childIndex) => {
      const childRender = renderChildNode(childLabel, parentRender.parentX, parentRender.parentY, parentRender.parentAngle, childIndex, childLabels.length, CONFIG);
      svgParts.push(childRender.nodes);
      svgParts.push(childRender.lines);
    });
  });
  svgParts.push('</svg>');
  return svgParts.join('');
}

export { renderMindmapAsSvgString };