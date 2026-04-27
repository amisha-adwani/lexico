import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".docx"]);

export function isAllowedUpload({ mimetype = "", originalname = "" }) {
  const extension = getExtension(originalname);
  return ALLOWED_MIME_TYPES.has(mimetype) && ALLOWED_EXTENSIONS.has(extension);
}

export async function extractTextFromFile(file) {
  if (!file?.buffer) {
    throw new Error("Uploaded file is missing");
  }

  const extension = getExtension(file.originalname);

  if (extension === ".pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return sanitizeExtractedText(parsed?.text || "");
  }

  if (extension === ".txt") {
    return sanitizeExtractedText(file.buffer.toString("utf-8"));
  }

  if (extension === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return sanitizeExtractedText(parsed?.value || "");
  }

  throw new Error("Unsupported file type");
}

function getExtension(filename = "") {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

function sanitizeExtractedText(value) {
  let text = String(value).replace(/\r\n/g, "\n");

  // Normalize spacing
  text = text.replace(/\n{2,}/g, "\n");

  // 🔹 Convert comma lists into bullet-like structure
  text = text.replace(/, /g, "\n- ");

  // 🔹 Convert common structure phrases into sections
  text = text.replace(
    /(includes|such as|consists of|types of|categories of)/gi,
    (match) => `${match}:\n-`
  );

  // 🔹 Improve readability for model
  text = text.replace(/\.\s+/g, ".\n");

  return text.trim();
}

