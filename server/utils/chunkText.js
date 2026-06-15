const DEFAULT_MAX_CHUNK_CHARS = 1200;
const DEFAULT_MIN_CHUNK_CHARS = 400;
const MAX_EXCERPT_LENGTH = 200;

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function createExcerpt(text) {
  const excerpt = text.replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT_LENGTH);
  return excerpt;
}

function splitBySentences(text) {
  const sentenceBoundary = /(?<=[.!?])\s+(?=[A-Z0-9"'“‘])/g;
  return text
    .split(sentenceBoundary)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function splitLongBlock(block, maxChunkChars, minChunkChars) {
  const sentences = splitBySentences(block);
  if (sentences.length === 0) {
    return [block];
  }

  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (current.length + 1 + sentence.length <= maxChunkChars) {
      current += ` ${sentence}`;
      continue;
    }

    if (current.length >= minChunkChars) {
      chunks.push(current.trim());
      current = sentence;
      continue;
    }

    const splitPoint = Math.max(
      minChunkChars,
      Math.min(
        maxChunkChars,
        Math.floor((current.length + sentence.length) / 2),
      ),
    );
    const combined = `${current} ${sentence}`;
    const forced = combined.match(new RegExp(`.{1,${splitPoint}}`, "gs")) || [
      combined,
    ];
    chunks.push(...forced.map((part) => part.trim()).filter(Boolean));
    current = "";
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

function splitTextIntoBlocks(text, maxChunkChars, minChunkChars) {
  if (!text) {
    return [];
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const blocks = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChunkChars) {
      blocks.push(paragraph);
      continue;
    }

    const pieces = splitLongBlock(paragraph, maxChunkChars, minChunkChars);
    if (pieces.length > 0) {
      blocks.push(...pieces);
      continue;
    }

    const fallback = paragraph.match(
      new RegExp(`.{1,${maxChunkChars}}`, "gs"),
    ) || [paragraph];
    blocks.push(...fallback.map((part) => part.trim()).filter(Boolean));
  }

  return blocks;
}

export default function chunkText(text, options = {}) {
  const normalizedText = normalizeText(text);
  const maxChunkChars = Number.isInteger(options.maxChunkChars)
    ? options.maxChunkChars
    : DEFAULT_MAX_CHUNK_CHARS;
  const minChunkChars = Number.isInteger(options.minChunkChars)
    ? options.minChunkChars
    : DEFAULT_MIN_CHUNK_CHARS;
  const sourceType =
    typeof options.type === "string" && options.type.trim()
      ? options.type.trim()
      : "text";
  const pageNumber = Number.isInteger(options.page) ? options.page : undefined;

  const chunks = splitTextIntoBlocks(
    normalizedText,
    maxChunkChars,
    minChunkChars,
  );

  const sourceMap = {};
  const resultChunks = [];
  let cursor = 0;

for (let index = 0; index < chunks.length; index += 1) {
  const chunkContent = chunks[index];
  const chunkId = `chunk-${index + 1}`;

  const offsetStart = normalizedText.indexOf(chunkContent, cursor);
  const safeOffsetStart = offsetStart >= 0 ? offsetStart : cursor;
  const offsetEnd = safeOffsetStart + chunkContent.length;

  const excerpt = createExcerpt(chunkContent);

  const entry = {
    sourceId: chunkId,
    type: sourceType,
    index,
    excerpt,
    offsetStart: safeOffsetStart,
    offsetEnd,
  };

  if (pageNumber !== undefined) {
    entry.page = pageNumber;
  }

  sourceMap[chunkId] = entry;

  resultChunks.push({
    chunkId,
    text: chunkContent,
    index,
    offsetStart: safeOffsetStart,
    offsetEnd,
    excerpt,
    page: pageNumber,
  });

  cursor = offsetEnd;
}
  return {
    chunks: resultChunks,
    sourceMap,
  };
}
