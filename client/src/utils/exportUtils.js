
const CONTROL_CHARS_REGEX = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`,
  'g'
);

export function isBlocksExportContext(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.blocks));
}

export function getExportButtonFromEvent(maybeEvent) {
  if (!maybeEvent || typeof maybeEvent !== 'object') return null;
  return maybeEvent.currentTarget || null;
}

export function setButtonBusy(button) {
  if (!button) return null;
  const originalText = button.textContent;
  const originalDisabled = button.disabled;

  button.disabled = true;
  button.textContent = 'Exporting...';

  return { originalText, originalDisabled };
}

export function restoreButtonState(button, originalState) {
  if (!button || !originalState) return;
  button.disabled = Boolean(originalState.originalDisabled);
  button.textContent = originalState.originalText;
}

function inferSelectedFileNameFromDom() {
  const fileInput = document.querySelector('#source-file');
  const name = fileInput?.files?.[0]?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  // Fallback to displayed "Selected: <name>".
  const selectedP = Array.from(document.querySelectorAll('p')).find((p) =>
    /Selected:\s*/i.test(p.textContent)
  );
  const match = selectedP?.textContent.match(/Selected:\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

function inferInputTextFromDom() {
  const textarea = document.querySelector('textarea');
  const value = textarea?.value;
  return typeof value === 'string' ? value : '';
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractPlainTextFromDom() {
  const wrapperNodes = Array.from(document.querySelectorAll('[data-export-chart]'));
  if (wrapperNodes.length === 0) return '';

  const sections = wrapperNodes.map((wrapper, index) => {
    const headingEl = wrapper.querySelector('h1, h2, h3');
    const heading = headingEl?.textContent?.trim() || `Block ${index + 1}`;

    let body = (wrapper.innerText || '').trim();
    if (heading) {
      body = body.replace(new RegExp(escapeRegExp(heading)), '');
    }
    body = body
      .replace(/\b(Expand|Collapse)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return `${index + 1}. ${heading}\n${body || 'No text provided.'}`;
  });

  return sections.join('\n\n');
}

function inferTopicNameFromCandidates(candidates) {
  const best = candidates.find((v) => typeof v === 'string' && v.trim()) || 'topic';
  return best
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ');
}

export function inferFilenameFromDom() {
  const selectedFileName = inferSelectedFileNameFromDom();
  if (selectedFileName) {
    const fromFile = removeExtension(selectedFileName);
    if (fromFile) return sanitizeFileName(fromFile);
  }

  const wrapperNodes = Array.from(document.querySelectorAll('[data-export-chart]'));
  const firstHeading = wrapperNodes[0]?.querySelector('h1, h2, h3')?.textContent?.trim();
  const inputText = inferInputTextFromDom();

  const topic = inferTopicNameFromCandidates([firstHeading, inputText]);
  return sanitizeFileName(topic || 'simplified-output');
}

export function buildExportFileName({ selectedFile, outputBlocks, inputText }) {
  const fileName = typeof selectedFile === 'string' ? selectedFile : selectedFile?.name || '';
  const fromFile = removeExtension(fileName);
  if (fromFile) {
    return sanitizeFileName(fromFile);
  }

  const topic = inferTopicName(outputBlocks, inputText);
  return sanitizeFileName(topic || 'simplified-output');
}

function removeExtension(filename) {
  return (filename || '').replace(/\.[^./\\]+$/, '').trim();
}

function inferTopicName(blocks, inputText) {
  const candidates = [
    blocks?.[0]?.title,
    blocks?.[0]?.content,
    inputText,
  ].filter((value) => typeof value === 'string' && value.trim());

  const best = candidates[0] || 'topic';
  return best
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ');
}

function sanitizeFileName(value) {
  return value
    // Windows-invalid filename characters (plus control chars).
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'simplified-output';
}

export function buildPlainTextExport(blocks) {
  const sections = blocks.map((block, index) => {
    const heading = block?.title || block?.type || `Block ${index + 1}`;
    const body = extractPlainText(block).trim();
    return `${index + 1}. ${heading}\n${body || 'No text provided.'}`;
  });

  return sections.join('\n\n');
}

function extractPlainText(value) {
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => extractPlainText(entry))
      .filter(Boolean)
      .join('\n');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key !== 'type' && key !== 'visualType')
      .map(([key, entry]) => {
        const extracted = extractPlainText(entry);
        if (!extracted) return '';
        return `${key}: ${extracted}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
}