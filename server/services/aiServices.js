import client from "../config/aiClient.js";
import buildPrompt from "../utils/buildPrompt.js";
import cleanJSON from "../utils/cleanJSON.js";
import normalizeBlocks from "../utils/normalizeBlocks.js";

export async function simplifyText({ text, language }) {
  if (!client?.generateContent) {
    throw new Error("AI client is not configured correctly");
  }

  const prompt = buildPrompt({ text, language });

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