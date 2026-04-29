import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import {
  isBlocksExportContext,
  getExportButtonFromEvent,
  setButtonBusy,
  restoreButtonState,
  extractPlainTextFromDom,
  inferFilenameFromDom,
  buildExportFileName,
  buildPlainTextExport,
} from './exportUtils.js';

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

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const lineHeight = 18;
    const contentWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Simplified Output', margin, margin);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    let y = margin + 28;
    const textLines = doc.splitTextToSize(
      blocksDomPlainText || 'No text content available.',
      contentWidth
    );

    textLines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    const chartElements = Array.from(document.querySelectorAll('[data-export-chart="true"]'));
    if (chartElements.length > 0) {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Charts', margin, margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      let chartY = margin + 18;
      for (let index = 0; index < chartElements.length; index += 1) {
        const element = chartElements[index];
        const chartTitle = element.getAttribute('data-chart-title') || `Chart ${index + 1}`;
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
        });

        const imageData = canvas.toDataURL('image/png');
        const availableWidth = contentWidth;
        const imageHeight = (canvas.height * availableWidth) / canvas.width;

        const titleHeight = 18;
        const blockSpacing = 16;
        const requiredHeight = titleHeight + imageHeight + blockSpacing;

        if (chartY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          chartY = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(chartTitle, margin, chartY);
        chartY += titleHeight;
        doc.addImage(imageData, 'PNG', margin, chartY, availableWidth, imageHeight);
        chartY += imageHeight + blockSpacing;
      }
    }

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to export PDF.';
    if (typeof window !== 'undefined') window.alert(message);
  } finally {
    restoreButtonState(button, originalButtonState);
  }
}

async function exportBlocksToPdfInternal({ blocks, inputText, selectedFile }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 18;
  const contentWidth = pageWidth - margin * 2;

  const plainText = buildPlainTextExport(blocks);
  const filename = buildExportFileName({ selectedFile, outputBlocks: blocks, inputText });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Simplified Output', margin, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  let y = margin + 28;
  const textLines = doc.splitTextToSize(plainText || 'No text content available.', contentWidth);

  textLines.forEach((line) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  const chartElements = Array.from(document.querySelectorAll('[data-export-chart="true"]'));
  if (chartElements.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Charts', margin, margin);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    let chartY = margin + 18;
    for (let index = 0; index < chartElements.length; index += 1) {
      const element = chartElements[index];
      const chartTitle = element.getAttribute('data-chart-title') || `Chart ${index + 1}`;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const imageData = canvas.toDataURL('image/png');
      const availableWidth = contentWidth;
      const imageHeight = (canvas.height * availableWidth) / canvas.width;

      const titleHeight = 18;
      const blockSpacing = 16;
      const requiredHeight = titleHeight + imageHeight + blockSpacing;

      if (chartY + requiredHeight > pageHeight - margin) {
        doc.addPage();
        chartY = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(chartTitle, margin, chartY);
      chartY += titleHeight;
      doc.addImage(imageData, 'PNG', margin, chartY, availableWidth, imageHeight);
      chartY += imageHeight + blockSpacing;
    }
  }

  doc.save(`${filename}.pdf`);
}