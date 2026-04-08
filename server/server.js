import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const port = process.env.PORT || 5000;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const client = genAI
  ? genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.2,
      },
    })
  : null;

function buildPrompt({ text, language }) {
  const languageLine = language ? `Language: ${language}\n` : "";

  return `
You are an assistant that analyzes and summarizes user text into structured content blocks for a dynamic UI.

CRITICAL RULES:
- Return ONLY valid JSON
- Do NOT include markdown (no \`\`\`)
- Do NOT include explanations or extra text
- Output must be directly JSON.parse-able
- Return an array with 3 to 8 blocks

OUTPUT FORMAT:
[
  {
    "type": "string",
    "title": "string",
    "content": "string",
    "extra": ["optional"]
  }
]

BLOCK GUIDELINES:
- Include at least these block intents:
  1) one main takeaway ("key_point" or "main_insight")
  2) one concise bullet summary ("bullet" with "extra" array for list items)
  3) one optional caution/risk if relevant ("warning")
- Use meaningful types like: "text", "bullet", "warning", "flow", "example", "key_point"
- You may create custom types if helpful
- Keep content short and easy to scan
- Prefer bullet-style content over long paragraphs
- Use "warning" for risks or important notes
- Use "flow" for step-by-step processes (put steps in "extra")

${languageLine}
TEXT:
${text}
`;
}

/**
 * Clean AI response (remove markdown if present)
 */
function cleanJSON(raw) {
  return raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeBlocks(candidate) {
  if (!Array.isArray(candidate)) return [];

  return candidate
    .filter((block) => block && typeof block === "object")
    .map((block) => {
      const type = typeof block.type === "string" && block.type.trim()
        ? block.type.trim()
        : "text";

      const title = typeof block.title === "string" ? block.title.trim() : "";
      const content = typeof block.content === "string" ? block.content.trim() : "";
      const extra = Array.isArray(block.extra)
        ? block.extra.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [];

      const normalized = { type };

      if (title) normalized.title = title;
      if (content) normalized.content = content;
      if (extra.length > 0) normalized.extra = extra;

      return normalized;
    })
    .filter((block) => block.content || (Array.isArray(block.extra) && block.extra.length > 0));
}

app.post("/api/simplify", async (req, res) => {
  try {
    const { text, language } = req.body ?? {};

    if (typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Missing required field: text" });
    }

    if (!client) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
    }

    const prompt = buildPrompt({ text, language });

    const completion = await client.generateContent(prompt);
    const raw = completion?.response?.text?.() ?? "";

    console.log(" RAW AI OUTPUT:\n", raw);

    let blocks;

    try {
      const cleaned = cleanJSON(raw);
      blocks = normalizeBlocks(JSON.parse(cleaned));
    } catch (parseError) {
      console.error(" JSON PARSE FAILED:", parseError);

      blocks = [
        {
          type: "text",
          content: raw,
        },
      ];
    }

    if (!blocks.length) {
      blocks = [
        {
          type: "text",
          title: "Summary",
          content: "The model returned an empty response. Please try again.",
        },
      ];
    }

    return res.json({ blocks });
  } catch (err) {
    console.error(" SERVER ERROR:", err);

    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(` API listening on http://localhost:${port}`);
});
