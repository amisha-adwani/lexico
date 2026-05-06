
const CONTROL_CHARS_REGEX = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`,
  'g'
);

// ─── Validators ───────────────────────────────────────
/** Check if a value is a valid blocks export context. */
export function isBlocksExportContext(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.blocks));
}

// ─── Button state ─────────────────────────────────────
/** Get the export button element from an event object. */
export function getExportButtonFromEvent(maybeEvent) {
  if (!maybeEvent || typeof maybeEvent !== 'object') return null;
  return maybeEvent.currentTarget || null;
}

/** Disable a button and return its original state for later restoration. */
export function setButtonBusy(button) {
  if (!button) return null;
  const originalText = button.textContent;
  const originalDisabled = button.disabled;

  button.disabled = true;
  button.textContent = 'Exporting...';

  return { originalText, originalDisabled };
}

/** Restore a button to its original enabled/disabled state. */
export function restoreButtonState(button, originalState) {
  if (!button || !originalState) return;
  button.disabled = Boolean(originalState.originalDisabled);
  button.textContent = originalState.originalText;
}

// ─── DOM inference ────────────────────────────────────
/** Extract the selected file name from the file input or selected display element. */
function inferSelectedFileNameFromDom() {
  const fileInput = document.querySelector('#source-file');
  const name = fileInput?.files?.[0]?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  const selectedP = Array.from(document.querySelectorAll('p')).find((p) =>
    /Selected:\s*/i.test(p.textContent)
  );
  const match = selectedP?.textContent.match(/Selected:\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || '';
}

/** Extract the current textarea input text from the DOM. */
function inferInputTextFromDom() {
  const textarea = document.querySelector('textarea');
  const value = textarea?.value;
  return typeof value === 'string' ? value : '';
}

/** Extract plain text content from all exportable chart sections in the DOM. */
export function extractPlainTextFromDom() {
  const wrapperNodes = Array.from(
    document.querySelectorAll('[data-export-text="true"]')
  );
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

/** Infer a suitable filename for export from DOM state. */
export function inferFilenameFromDom() {
  const selectedFileName = inferSelectedFileNameFromDom();
  if (selectedFileName) {
    const fromFile = removeExtension(selectedFileName);
    if (fromFile) return sanitizeFileName(fromFile);
  }

  const wrapperNodes = Array.from(document.querySelectorAll('[data-export-chart]'));
  const firstHeading = wrapperNodes[0]?.querySelector('h1, h2, h3')?.textContent?.trim();
  const inputText = inferInputTextFromDom();

  const topic = inferTopicName([firstHeading, inputText]);
  return sanitizeFileName(topic || 'simplified-output');
}

// ─── Filename builders ────────────────────────────────
/** Build an export filename from a selected file or inferred topic. */
export function buildExportFileName({ selectedFile, outputBlocks, inputText }) {
  const fileName = typeof selectedFile === 'string' ? selectedFile : selectedFile?.name || '';
  const fromFile = removeExtension(fileName);
  if (fromFile) {
    return sanitizeFileName(fromFile);
  }

  const topic = inferTopicName([outputBlocks?.[0]?.content, inputText]);
  return sanitizeFileName(topic || 'simplified-output');
}

/** Remove the file extension from a filename string. */
function removeExtension(filename) {
  return (filename || '').replace(/\.[^./\\]+$/, '').trim();
}

/** Infer a topic name from block data or input text. */
function inferTopicName(candidates = []) {
  const all = candidates.filter(v => typeof v === 'string' && v.trim());
  const best = all[0] || 'topic';
  return best.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
}

/** Choose the best candidate topic name from a list of values. */


/** Sanitize a string for use as a safe filename. */
function sanitizeFileName(value) {
  return value
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'simplified-output';
}

// ─── Plain text export ────────────────────────────────
/** Build a formatted plain text representation of output blocks. */
export function buildPlainTextExport(blocks) {
  const sections = blocks
    .filter(block => {
      const type = (block?.type || '').toLowerCase();
      return !['visual', 'flow', 'steps', 'process', 'comparison', 'mindmap'].includes(type);
    })
    .map((block, index) => {
      const rawType = block?.type || '';
      const heading = block?.title || (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : `Block ${index + 1}`);
      const body = sanitizeForPdf(extractPlainText(block).trim());
      return `${index + 1}. ${heading}\n${body || 'No text provided.'}`;
    });
  return sections.join('\n\n');
}

/** Recursively extract plain text from nested block structures. */
function extractPlainText(block) {
  if (!block || typeof block !== 'object') return '';

  const parts = [];

  if (typeof block.content === 'string' && block.content.trim()) {
    parts.push(block.content.trim());
  }

  if (Array.isArray(block.extra)) {
    block.extra
      .filter(item => typeof item === 'string' && item.trim())
      .forEach(item => parts.push(item.trim()));
  }

  if (typeof block.points === 'string' && block.points.trim()) {
    parts.push(block.points.trim());
  }

  return parts.join('\n');
}

// ─── String utilities ─────────────────────────────────
/** Escape special regex characters in a string. */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeForPdf(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[^\x00-\x7F]/g, '') // strip non-ASCII
    .replace(/&\s*[a-z]+;/gi, '')  // strip any escaped HTML entities like &amp; &þ;
    .trim();
}
