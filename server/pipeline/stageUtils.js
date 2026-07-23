import cleanJSON from "../utils/cleanJSON.js";
import { createStageError } from "../utils/logging.js";

export function nowMs() {
  return Date.now();
}

function stripComments(text) {
  let result = "";
  let inString = false;
  let quoteChar = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") {
        i += 1;
      }
      if (i < text.length) {
        result += "\n";
      }
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        i += 1;
      }
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function extractBalancedJsonCandidate(text) {
  const stack = [];
  let startIndex = -1;
  let inString = false;
  let quoteChar = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      continue;
    }

    if (char === "{" || char === "[") {
      if (stack.length === 0) {
        startIndex = i;
      }
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      if (stack.length > 0) {
        const last = stack.pop();
        if (last === "{" && char === "}" ) {
          if (stack.length === 0) {
            return text.slice(startIndex, i + 1);
          }
        } else if (last === "[" && char === "]") {
          if (stack.length === 0) {
            return text.slice(startIndex, i + 1);
          }
        }
      }
    }
  }

  return null;
}

function escapeJsonStringContent(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function skipWhitespace(text, index) {
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

function findMatchingBrace(text, startIndex) {
  let depth = 0;
  let inString = false;
  let quoteChar = "";
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function unwrapBareArrayObjects(candidate) {
  let repaired = candidate;
  let changed = true;

  while (changed) {
    changed = false;
    let index = 0;

    while (index < repaired.length) {
      const openBrace = repaired.indexOf("{", index);
      if (openBrace < 0) break;

      const afterOpen = skipWhitespace(repaired, openBrace + 1);
      if (afterOpen < repaired.length && repaired[afterOpen] === "[") {
        const afterBracket = skipWhitespace(repaired, afterOpen + 1);
        if (afterBracket < repaired.length && repaired[afterBracket] === "{") {
          const innerObjectEnd = findMatchingBrace(repaired, afterBracket);
          const afterInner = skipWhitespace(repaired, innerObjectEnd + 1);
          if (innerObjectEnd >= 0 && afterInner < repaired.length && repaired[afterInner] === "]") {
            const afterArray = skipWhitespace(repaired, afterInner + 1);
            if (afterArray < repaired.length && repaired[afterArray] === "}") {
              const innerObjectText = repaired.slice(afterBracket, innerObjectEnd + 1);
              repaired = repaired.slice(0, openBrace) + innerObjectText + repaired.slice(afterArray + 1);
              changed = true;
              break;
            }
          }
        }
      }

      index = openBrace + 1;
    }
  }

  return repaired;
}

function repairJsonCandidate(candidate) {
  let repaired = candidate
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/(\{|\[)\s+/g, "$1")
    .replace(/\s+(\}|\])/g, "$1");

  repaired = repaired.replace(/(\{|,|\s)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":');

  repaired = repaired.replace(/(\:\s*|[\[,]\s*|^\s*)'((?:\\.|[^'\\])*)'/g, (match, prefix, inner) => {
    return `${prefix}"${escapeJsonStringContent(inner)}"`;
  });

  repaired = unwrapBareArrayObjects(repaired);

  return repaired;
}

export async function tryParseAiJson(raw) {
  if (!raw || typeof raw !== "string") return { error: "no_response", raw };

  const candidates = [];
  const cleaned = cleanJSON(raw);
  candidates.push(cleaned);

  const extracted = extractBalancedJsonCandidate(cleaned);
  if (extracted) {
    candidates.push(extracted);
  }

  const trimmedCandidates = Array.from(new Set(candidates.filter(Boolean)));

  for (const candidate of trimmedCandidates) {
    try {
      return { parsed: JSON.parse(candidate), cleaned: candidate };
    } catch (err) {
      // Try the next candidate.
    }
  }

  const repairedCandidates = [];
  for (const candidate of trimmedCandidates) {
    const withCommentsRemoved = stripComments(candidate);
    if (withCommentsRemoved !== candidate) {
      repairedCandidates.push(withCommentsRemoved);
    }

    const repaired = repairJsonCandidate(withCommentsRemoved);
    if (repaired !== candidate && repaired !== withCommentsRemoved) {
      repairedCandidates.push(repaired);
    }

    const withTrailingCommasRemoved = withCommentsRemoved.replace(/,\s*([}\]])/g, "$1");
    if (withTrailingCommasRemoved !== candidate && withTrailingCommasRemoved !== withCommentsRemoved) {
      repairedCandidates.push(withTrailingCommasRemoved);
    }
  }

  for (const candidate of Array.from(new Set(repairedCandidates.filter(Boolean)))) {
    try {
      return { parsed: JSON.parse(candidate), cleaned: candidate, recovered: true };
    } catch (err) {
      // Try the next candidate.
    }
  }

  return { error: "parse_failed", raw, reason: "Unable to parse AI JSON response", cleaned };
}

export function normalizeStageFailure(stageError) {
  if (!stageError) return null;
  return {
    stage: stageError.stage || "unknown",
    reason: stageError.reason || stageError.message || "stage_failed",
    recoverable: stageError.recoverable !== false,
    suggestedFix: stageError.suggestedFix || "Retry the request with clearer input.",
    details: Array.isArray(stageError.details) ? stageError.details : [],
  };
}

export function buildFailureResult({ errorType, stage, reason, options = {}, payload = {} }) {
  const stageError = createStageError(stage, reason, options);
  const failure = normalizeStageFailure(stageError);
  return {
    success: false,
    errorType,
    message: failure.reason,
    stageError: failure,
    ...payload,
  };
}

export function successStageResult(stage, output, durationMs, warnings = [], errors = [], repairLog = null, metrics = []) {
  return {
    success: true,
    stage,
    output,
    warnings,
    errors,
    repairLog,
    metrics,
    durationMs,
    stopPipeline: false,
  };
}

export function failedStageResult(stage, durationMs, pipelineResult, warnings = [], errors = [], repairLog = null, metrics = []) {
  return {
    success: false,
    stage,
    output: null,
    warnings,
    errors,
    repairLog,
    metrics,
    durationMs,
    stopPipeline: true,
    pipelineResult,
  };
}
