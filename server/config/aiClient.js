
const model = process.env.MODEL;
const temperature = Number(process.env.TEMP) || 0.2;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const requestTimeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS) || 30000;
const maxOutputTokens = Number(process.env.MAX_OUTPUT_TOKENS) || null;

function extractMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object" && Array.isArray(content.parts)) {
    return content.parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("")
      .trim();
  }

  return "";
}

function estimateTokenCount(text = "") {
  if (typeof text !== "string" || !text.length) return 0;
  return Math.ceil(text.length / 4);
}

function extractCandidates(data) {
  if (Array.isArray(data?.choices)) return data.choices;
  if (Array.isArray(data?.candidates)) return data.candidates;
  return [];
}

function extractCandidateParts(candidate) {
  if (!candidate || typeof candidate !== "object") return [];

  if (Array.isArray(candidate?.message?.content)) {
    return candidate.message.content.map((part, index) => ({
      index,
      type: part?.type || "text",
      text: typeof part?.text === "string" ? part.text : "",
    }));
  }

  if (typeof candidate?.message?.content === "string") {
    return [{ index: 0, type: "text", text: candidate.message.content }];
  }

  if (Array.isArray(candidate?.content?.parts)) {
    return candidate.content.parts.map((part, index) => ({
      index,
      type: part?.type || "text",
      text: typeof part?.text === "string" ? part.text : "",
    }));
  }

  return [];
}

function extractFinishReason(candidate) {
  return candidate?.finish_reason || candidate?.finishReason || null;
}

function extractUsage(data) {
  return data?.usage || data?.usageMetadata || null;
}

function classifyResponseState({ text, candidates, finishReason }) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "empty_candidates";
  }

  if (typeof text !== "string") {
    return "missing_text";
  }

  if (!text.trim()) {
    if (finishReason) {
      return `empty_text_finish_${String(finishReason).toLowerCase()}`;
    }
    return "empty_text";
  }

  return "ok";
}

function normalizeRequestId(headers) {
  if (!headers || typeof headers.get !== "function") return null;
  return (
    headers.get("x-request-id") ||
    headers.get("request-id") ||
    headers.get("cf-ray") ||
    null
  );
}

async function generateContentDetailed(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }
  if (!model) {
    throw new Error("Missing MODEL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.APP_URL ? { "HTTP-Referer": process.env.APP_URL } : {}),
        ...(process.env.APP_NAME ? { "X-Title": process.env.APP_NAME } : {}),
      },
      body: JSON.stringify({
        model,
        temperature,
        ...(Number.isFinite(maxOutputTokens) && maxOutputTokens > 0
          ? { max_tokens: maxOutputTokens }
          : {}),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const causeCode = error?.cause?.code;
    const causeMessage = error?.cause?.message;
    const message = error?.name === "AbortError"
      ? `OpenRouter request timeout after ${requestTimeoutMs}ms`
      : `OpenRouter network error (${causeCode || "unknown"}): ${causeMessage || error?.message || "fetch failed"}`;
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter Error: ${errorText}`);
  }

  const data = await res.json();
  const candidates = extractCandidates(data);
  const primaryCandidate = candidates[0] || null;
  const responseParts = extractCandidateParts(primaryCandidate);
  const content = primaryCandidate?.message?.content || primaryCandidate?.content || "";
  const responseText = extractMessageContent(content);
  const finishReason = extractFinishReason(primaryCandidate);
  const usage = extractUsage(data);
  const requestId = normalizeRequestId(res.headers);

  return {
    model,
    temperature,
    maxOutputTokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 0 ? maxOutputTokens : null,
    timeoutMs: requestTimeoutMs,
    endpoint,
    requestId,
    response: data,
    candidates,
    responseParts,
    responseText,
    responseTextLength: responseText?.length || 0,
    finishReason,
    usage,
    estimatedPromptTokens: estimateTokenCount(prompt),
    responseState: classifyResponseState({
      text: responseText,
      candidates,
      finishReason,
    }),
  };
}

async function generateContent(prompt) {
  const result = await generateContentDetailed(prompt);
  return result.responseText;
}

export default {
  generateContent,
  generateContentDetailed,
};
