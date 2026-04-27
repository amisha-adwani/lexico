
const model = process.env.MODEL || "inclusionai/ling-2.6-1t:free";
const temperature = Number(process.env.TEMP) || 0.2;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";

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

  const res = await fetch(endpoint, {
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
  });

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