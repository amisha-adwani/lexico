import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const port = process.env.PORT || 5000;
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemma-3-4b-it";

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
  You are an assistant that converts complex text into structured, visual-first content blocks for a dynamic UI.
  
  CRITICAL RULES:
  - Return ONLY valid JSON
  - Do NOT include markdown (no \`\`\`)
  - Do NOT include explanations or extra text
  - Output must be directly JSON.parse-able
  - Return an array with 3 to 7 blocks
  
  OUTPUT FORMAT:
  [
    {
      "type": "string",
      "title": "string (optional)",
      "content": "string (optional)",
      "extra": ["optional"]
    }
  ]
  
  BLOCK TYPES:
  - "main_insight" → key takeaway (VERY SHORT)
  - "concept" → simple explanation
  - "bullets" → key points (use "extra" array)
  - "warning" → risks / important notes
  - "visual" → structured visualization (see below)
  
  ----------------------------------------
  
  VISUAL BLOCK RULES (VERY IMPORTANT):
  
  - You may include ONE "visual" block if the content benefits from structured visualization
  - The "visual" block MUST include a "visualType" field
  
  Allowed visualTypes:
  - "flow" → step-by-step process
  - "timeline" → events over time
  - "mindmap" → central idea with branches
  - "comparison" → comparing 2+ things
  - "table" → structured data
  
  Choose the BEST visualType automatically:
  - Use "flow" for processes
  - Use "comparison" for differences
  - Use "mindmap" for concepts with sub-parts
  - Use "timeline" for chronological order
  - Use "table" for structured data
  - For "mindmap", ensure at least 2–5 children when possible
  
  DO NOT force "flow" if it's not a process.
  
  ----------------------------------------
  
  VISUAL STRUCTURES:
  
  For "flow":
  {
    "type": "visual",
    "visualType": "flow",
    "title": "string",
    "steps": ["short step", "short step", "short step"]
  }
  
  For "timeline":
  {
    "type": "visual",
    "visualType": "timeline",
    "title": "string",
    "points": [
      { "label": "event", "time": "optional", "desc": "short description" }
    ]
  }
  
  For "mindmap":
  {
    "type": "visual",
    "visualType": "mindmap",
    "title": "string",
    "nodes": [
      {
        "label": "main idea",
        "children": ["child1", "child2"]
      }
    ]
  }
  
  For "comparison":
  {
    "type": "visual",
    "visualType": "comparison",
    "title": "string",
    "items": [
      { "label": "A", "points": ["point", "point"] },
      { "label": "B", "points": ["point", "point"] }
    ]
  }
  
  For "table":
  {
    "type": "visual",
    "visualType": "table",
    "title": "string",
    "headers": ["col1", "col2"],
    "rows": [["val1", "val2"]]
  }
  
  ----------------------------------------
  
  STRICT VISUAL STYLE RULES:
  
  - Each content field must be <= 20 words
  - Each bullet must be <= 8 words
  - Each flow step must be <= 5 words
  - Prefer phrases over full sentences
  - Avoid paragraphs completely
  - Keep everything highly scannable
  
  ----------------------------------------
  
  REQUIRED STRUCTURE:
  
  - Always include 1 "main_insight"
  - Include 1 "bullets" block
  - Include 1 "concept" block (if explanation needed)
  - Include 1 "warning" block if risk exists
  - Include 1 "visual" block if useful
  
  ----------------------------------------
  
  TONE:
  - Simple
  - Clear
  - Like a great teacher
  - Not formal or academic
  
  ----------------------------------------
  
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

  const cleanArray = (value) =>
    Array.isArray(value)
      ? value
          .filter((item) => typeof item === "string" && item.trim())
          .map((item) => item.trim())
      : [];

  const cleanPoints = (value) =>
    Array.isArray(value)
      ? value
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            label: typeof item.label === "string" ? item.label.trim() : "",
            time: typeof item.time === "string" ? item.time.trim() : "",
            desc: typeof item.desc === "string" ? item.desc.trim() : "",
          }))
          .filter((item) => item.label || item.time || item.desc)
      : [];

  const cleanNodes = (value) =>
    Array.isArray(value)
      ? value
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            label: typeof item.label === "string" ? item.label.trim() : "",
            children: cleanArray(item.children),
          }))
          .filter((item) => item.label)
      : [];

  const cleanComparisonItems = (value) =>
    Array.isArray(value)
      ? value
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            label: typeof item.label === "string" ? item.label.trim() : "",
            points: cleanArray(item.points),
          }))
          .filter((item) => item.label || item.points.length > 0)
      : [];

  const cleanRows = (value) =>
    Array.isArray(value)
      ? value
          .filter((row) => Array.isArray(row))
          .map((row) =>
            row
              .filter((col) => typeof col === "string" && col.trim())
              .map((col) => col.trim())
          )
          .filter((row) => row.length > 0)
      : [];

  return candidate
    .filter((block) => block && typeof block === "object")
    .map((block) => {
      const type = typeof block.type === "string" && block.type.trim()
        ? block.type.trim()
        : "text";
      const normalizedType = type.toLowerCase();

      const title = typeof block.title === "string" ? block.title.trim() : "";
      const content = typeof block.content === "string" ? block.content.trim() : "";
      const legacyFlow = normalizedType === "flow" || normalizedType === "steps" || normalizedType === "process";
      const legacyComparison =
        normalizedType === "comparison" || normalizedType === "compare" || normalizedType === "contrast";
      const isVisual = normalizedType === "visual" || legacyFlow || legacyComparison;

      const normalized = { type: isVisual ? "visual" : type };

      if (title) normalized.title = title;
      if (content) normalized.content = content;

      if (isVisual) {
        const allowedVisualTypes = new Set(["flow", "timeline", "mindmap", "comparison", "table"]);
        const requestedVisualType = typeof block.visualType === "string" ? block.visualType.trim().toLowerCase() : "";
        const visualType = allowedVisualTypes.has(requestedVisualType)
          ? requestedVisualType
          : legacyFlow
            ? "flow"
            : legacyComparison
              ? "comparison"
              : "";

        if (visualType) {
          normalized.visualType = visualType;
        }

        if (visualType === "flow") {
          const steps = cleanArray(block.steps ?? block.extra);
          if (steps.length > 0) normalized.steps = steps;
        }

        if (visualType === "timeline") {
          const points = cleanPoints(block.points);
          if (points.length > 0) normalized.points = points;
        }

        if (visualType === "mindmap") {
          const nodes = cleanNodes(block.nodes);
          if (nodes.length > 0) normalized.nodes = nodes;
        }

        if (visualType === "comparison") {
          let items = cleanComparisonItems(block.items);

          if (!items.length && block.extra && typeof block.extra === "object" && !Array.isArray(block.extra)) {
            const source = block.extra;
            const leftTitle = typeof source.leftTitle === "string" ? source.leftTitle.trim() : "Left";
            const rightTitle = typeof source.rightTitle === "string" ? source.rightTitle.trim() : "Right";
            const left = cleanArray(source.left);
            const right = cleanArray(source.right);

            items = [
              { label: leftTitle || "Left", points: left },
              { label: rightTitle || "Right", points: right },
            ].filter((item) => item.label || item.points.length > 0);
          }

          if (items.length > 0) normalized.items = items;
        }

        if (visualType === "table") {
          const headers = cleanArray(block.headers);
          const rows = cleanRows(block.rows);
          if (headers.length > 0) normalized.headers = headers;
          if (rows.length > 0) normalized.rows = rows;
        }
      } else {
        const extra = cleanArray(block.extra);
        if (extra.length > 0) normalized.extra = extra;
      }

      return normalized;
    })
    .filter((block) => {
      if (block.content) return true;
      if (Array.isArray(block.extra) && block.extra.length > 0) return true;
      if (block.type?.toLowerCase() === "visual" && typeof block.visualType === "string") {
        if (Array.isArray(block.steps) && block.steps.length > 0) return true;
        if (Array.isArray(block.points) && block.points.length > 0) return true;
        if (Array.isArray(block.nodes) && block.nodes.length > 0) return true;
        if (Array.isArray(block.items) && block.items.length > 0) return true;
        if (
          (Array.isArray(block.headers) && block.headers.length > 0) ||
          (Array.isArray(block.rows) && block.rows.length > 0)
        ) {
          return true;
        }
      }
      if (
        block.type?.toLowerCase() === "comparison" &&
        block.extra &&
        (block.extra.left?.length > 0 || block.extra.right?.length > 0)
      ) {
        return true;
      }
      return false;
    });
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
