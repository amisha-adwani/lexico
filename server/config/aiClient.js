
const model = process.env.MODEL;
const temperature = Number(process.env.TEMP) || 0.2;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const requestTimeoutMs = 30000;

function extractMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("")
      .trim();
  }

  return "";
}

async function generateContent(prompt) {
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
  const content = data?.choices?.[0]?.message?.content;
  return extractMessageContent(content);
}

export default {
  generateContent,
};
