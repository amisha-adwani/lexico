import { jsPDF } from "jspdf";

import {
  isBlocksExportContext,
  getExportButtonFromEvent,
  setButtonBusy,
  restoreButtonState,
  extractPlainTextFromDom,
  inferFilenameFromDom,
  buildExportFileName,
  buildPlainTextExport,
  sanitizeForPdf,
} from "./exportUtils.js";
import { renderMindmapAsSvgString } from "./mindmapSvgExport.js";
import { renderVisualAsSvgString } from './visualSvgExport.js';

const PDF_CONFIG = {
  margin: 40,
  lineHeight: 18,
  titleFontSize: 16,
  bodyFontSize: 11,
  chartTitleFontSize: 12,
  blockSpacing: 16,
  titleHeight: 18,
  lineSpacingAfterTitle: 12,
};

/** Add a title to the current PDF page. */
function addPageTitle(doc, text, config) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(config.titleFontSize);
  doc.text(text, config.margin, config.margin);
}

/** Write a text block to the PDF and handle pagination. */
function addTextBlock(doc, text, config) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - config.margin * 2;
  const textLines = doc.splitTextToSize(
    text || "No text content available.",
    contentWidth,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(config.bodyFontSize);

  let y = config.margin + config.titleFontSize + config.lineSpacingAfterTitle;
  textLines.forEach((line) => {
    if (y > pageHeight - config.margin) {
      doc.addPage();
      y = config.margin;
    }
    doc.text(sanitizeForPdf(line), config.margin, y);
    y += config.lineHeight;
  });
}

/** Add a chart title above a chart image. */
function addChartTitle(doc, title, y, config) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(config.chartTitleFontSize);
  doc.text(sanitizeForPdf(title), config.margin, y);
}

/** Build a canvas from any SVG string. */
async function buildSvgCanvas(svgString) {
  const widthMatch = svgString.match(/width="(\d+)"/);
  const heightMatch = svgString.match(/height="(\d+)"/);
  const svgWidth = parseInt(widthMatch?.[1] || '600');
  const svgHeight = parseInt(heightMatch?.[1] || '400');
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.src = svgUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const canvas = document.createElement('canvas');
  canvas.width = svgWidth;
  canvas.height = svgHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(svgUrl);

  return canvas;
}

/** Calculate fitted image dimensions for the PDF. */
function fitImageToPdf(canvasWidth, canvasHeight, availableWidth, maxHeight) {
  const imageHeight = (canvasHeight * availableWidth) / canvasWidth;
  const scale = imageHeight > maxHeight ? maxHeight / imageHeight : 1;
  return {
    finalWidth: availableWidth * scale,
    finalHeight: imageHeight * scale,
  };
}

/** Add the charts section to the PDF, rendering each element with the correct canvas builder. */
async function addChartsSection(doc, chartElements, config) {
  if (chartElements.length === 0) return;

  doc.addPage();
  addPageTitle(doc, "Charts", config);

  let chartY = config.margin + config.titleHeight;
  const pageHeight = doc.internal.pageSize.getHeight();
  const availableWidth = doc.internal.pageSize.getWidth() - config.margin * 2;

  for (const element of chartElements) {
    const visualType = element.getAttribute('data-visual-type');
    const chartTitle = element.getAttribute('data-chart-title') || 'Chart';
    
    let canvas;
    if (visualType === 'mindmap') {
      const data = JSON.parse(element.getAttribute('data-mindmap-json') || '{}');
      const svg = renderMindmapAsSvgString(data);
      canvas = await buildSvgCanvas(svg);
    } else if (['flow', 'timeline', 'comparison'].includes(visualType)) {
      const data = JSON.parse(element.getAttribute('data-visual-json') || '{}');
      data.visualType = visualType;
      const svg = renderVisualAsSvgString(data);
      if (svg) {
        canvas = await buildSvgCanvas(svg);
      }
    }

    if (!canvas) continue;

    const { finalWidth, finalHeight } = fitImageToPdf(
      canvas.width, canvas.height, availableWidth,
      pageHeight - config.margin * 2 - config.titleHeight - config.blockSpacing
    );

    const requiredHeight = config.titleHeight + finalHeight + config.blockSpacing;
    if (chartY + requiredHeight > pageHeight - config.margin) {
      doc.addPage();
      chartY = config.margin;
    }

    addChartTitle(doc, chartTitle, chartY, config);
    chartY += config.titleHeight;
    const imageData = canvas.toDataURL('image/png');
    doc.addImage(imageData, 'PNG', config.margin, chartY, finalWidth, finalHeight);
    chartY += finalHeight + config.blockSpacing;
  }
}

export async function exportBlocksToPdf(maybeContextOrEvent) {
  const button = getExportButtonFromEvent(maybeContextOrEvent);
  const originalButtonState = setButtonBusy(button);

  try {
    if (isBlocksExportContext(maybeContextOrEvent)) {
      const { blocks, inputText, selectedFile } = maybeContextOrEvent;
      await exportBlocksToPdfInternal({ blocks, inputText, selectedFile });
      return;
    }

    const blocksDomPlainText = extractPlainTextFromDom();
    const filename = inferFilenameFromDom();
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    addPageTitle(doc, "Simplified Output", PDF_CONFIG);
    addTextBlock(doc, blocksDomPlainText, PDF_CONFIG);

    const chartElements = Array.from(
      document.querySelectorAll('[data-export-chart="true"]'),
    );
    await addChartsSection(doc, chartElements, PDF_CONFIG);

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to export PDF.";
    if (typeof window !== "undefined") window.alert(message);
  } finally {
    restoreButtonState(button, originalButtonState);
  }
}

export async function exportBlocksToPdfInternal({
  blocks,
  inputText,
  selectedFile,
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const plainText = buildPlainTextExport(blocks);
  const filename = buildExportFileName({
    selectedFile,
    outputBlocks: blocks,
    inputText,
  });

  addPageTitle(doc, "Simplified Output", PDF_CONFIG);
  addTextBlock(doc, plainText, PDF_CONFIG);

const chartElements = Array.from(document.querySelectorAll('[data-export-chart="true"]'));
  await addChartsSection(doc, chartElements, PDF_CONFIG);

  doc.save(`${filename}.pdf`);
}