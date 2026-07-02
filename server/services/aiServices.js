import client from "../config/aiClient.js";
import buildPrompt from "../utils/buildPrompt.js";
import cleanJSON from "../utils/cleanJSON.js";
import normalizeBlocks from "../utils/normalizeBlocks.js";
import chunkText from "../utils/chunkText.js";
import buildCanonicalPrompt from "../utils/buildCanonicalPrompt.js";
import validateCanonicalIR from "../utils/canonicalValidation.js";

export async function simplifyText({ text, language, visualSkeleton }) {
  if (!client?.generateContent) {
    throw new Error("AI client is not configured correctly");
  }

  const prompt = buildPrompt({ text, language, visualSkeleton });

  const raw = await client.generateContent(prompt);

  try {
    const cleaned = cleanJSON(raw);
    const parsed = JSON.parse(cleaned);
    const blocks = normalizeBlocks(parsed);

    if (!blocks.length) {
      return fallbackBlocks();
    }

    return blocks;
  } catch (err) {
    console.error("Parse failed:", err);

    return fallbackBlocks(raw);
  }
}

function fallbackBlocks(raw = "") {
  return [
    {
      type: "main_insight",
      content: "Could not process content",
    },
    {
      type: "bullets",
      extra: ["Try again", "Simplify input", "Check text"],
    },
    raw && {
      type: "text",
      content: raw.slice(0, 200),
    },
  ].filter(Boolean);
}

async function tryParseAiJson(raw) {
  if (!raw || typeof raw !== 'string') return { error: 'no_response', raw };

  // First attempt: clean common LLM artifacts and parse
  try {
    const cleaned = cleanJSON(raw);
    return { parsed: JSON.parse(cleaned), cleaned };
  } catch (err) {
    // Try to heuristically extract a JSON object from the output
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = raw.slice(firstBrace, lastBrace + 1);
      try {
        const cleaned = cleanJSON(candidate);
        return { parsed: JSON.parse(cleaned), cleaned, extracted: true };
      } catch (e) {
        return { error: 'parse_failed', raw, reason: e.message };
      }
    }

    return { error: 'parse_failed', raw, reason: err.message };
  }
}

export async function generateCanonicalIR({ text, documentTitle, sourceFingerprint, language } = {}) {
  if (!client?.generateContent) {
    throw new Error("AI client is not configured correctly");
  }

  const { chunks, sourceMap } = chunkText(text || "");

  const prompt = buildCanonicalPrompt({ chunks, sourceMap });

  const raw = await client.generateContent(prompt);
  console.log("RAW RESPONSE:");
console.log(raw);

  const parseResult = await tryParseAiJson(raw);
console.log("PARSED IR:");
console.dir(parseResult.parsed, { depth: null });
  if (parseResult.error) {
    return {
      success: false,
      errorType: parseResult.error,
      message: parseResult.reason || 'Failed to parse LLM response',
      raw: parseResult.raw || raw,
    };
  }

  const aiIr = parseResult.parsed;

  // Attach backend-generated sourceMap before validation so validators can
  // resolve sourceRefs against the authoritative mapping.
  aiIr.sourceMap = sourceMap;

  const validation = validateCanonicalIR(aiIr, {
    documentTitle,
    sourceFingerprint,
  });
console.log("VALIDATED IR:");
console.dir(validation.ir, { depth: null });
  // If validation determined the IR is repairable, use the repaired version
  const finalIr = validation.ir || aiIr;

  // Ensure we attach the backend-managed sourceMap (do not trust LLM sourceMap)
  finalIr.sourceMap = sourceMap;

  if (!validation.isValid && !validation.isRepairable) {
    return {
      success: false,
      errorType: 'validation_failed',
      errors: validation.errors,
      warnings: validation.warnings,
      repairLog: validation.repairLog,
      ir: finalIr,
    };
  }

  return {
    success: true,
    ir: finalIr,
    errors: validation.errors,
    warnings: validation.warnings,
    repairLog: validation.repairLog,
  };
}