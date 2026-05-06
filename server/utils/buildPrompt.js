// ─── Constants ────────────────────────────────────────

const CRITICAL_RULES = `
- Return ONLY a valid JSON array — no markdown, no backticks, no explanation
- Output must be directly JSON.parse-able
- Return between 4 and 7 blocks total
- Never include more than one visual block
`.trim();

const STYLE_RULES = `
- Each content field: max 20 words
- Each bullet point: max 8 words
- Each flow step: max 5 words
- Prefer short phrases over full sentences
- Tone: simple, clear, like a great teacher
`.trim();

const BLOCK_SCHEMAS = `
BLOCK TYPES AND SCHEMAS:

{ "type": "main_insight", "title": "...", "content": "one sentence key takeaway" }
{ "type": "concept", "title": "...", "content": "simple explanation in plain language" }
{ "type": "bullets", "title": "...", "extra": ["short point", "short point", "short point"] }
{ "type": "warning", "title": "Important", "content": "risk or caveat — omit block if no real risk exists" }
{ "type": "summary", "title": "...", "content": "2-3 sentence overview" }

VISUAL BLOCK SCHEMAS (use the one that fits the content):

Flow (step-by-step process):
{ "type": "visual", "visualType": "flow", "title": "...", "steps": ["step 1", "step 2", "step 3"] }

Timeline (chronological events):
{ "type": "visual", "visualType": "timeline", "title": "...", "points": [{ "label": "event", "time": "year or date", "desc": "short description" }] }

Mindmap (concept with branches) — MAX 3-5 top-level nodes, each with 2-5 string children:
{ "type": "visual", "visualType": "mindmap", "title": "...", "nodes": [{ "label": "Category", "children": ["child1", "child2"] }] }

Comparison (two or more things):
{ "type": "visual", "visualType": "comparison", "title": "...", "items": [{ "label": "A", "points": ["point"] }, { "label": "B", "points": ["point"] }] }

Table (structured data):
{ "type": "visual", "visualType": "table", "title": "...", "headers": ["col1", "col2"], "rows": [["val1", "val2"]] }
`.trim();

const REQUIRED_BLOCKS = `
ALWAYS INCLUDE:
1. One "main_insight" block
2. One "concept" block
3. One "bullets" block
4. One "visual" block (choose the best visualType for the content)
5. One "warning" block — only if a real risk exists
6. One "summary" block
`.trim();

// ─── Skeleton prompt (deterministic visual structure) ─

export default function buildPrompt({ text, language, visualSkeleton }) {
  const langLine = language ? `Language: ${language}\n` : '';
  const nodeCount = visualSkeleton.nodes?.length ?? visualSkeleton.items?.length ?? visualSkeleton.steps?.length ?? 4;

  return `
You are a content extraction assistant. Analyze the text and return a JSON array of structured blocks.

CRITICAL RULES:
${CRITICAL_RULES}
- The visual block MUST use the template below — fill in content, never change structure or keys
- STRICT: The visual array (nodes/items/steps/points) must contain EXACTLY ${nodeCount} entries

VISUAL STRUCTURE TEMPLATE:
${JSON.stringify(visualSkeleton, null, 2)}

${REQUIRED_BLOCKS}

${BLOCK_SCHEMAS}

STYLE RULES:
${STYLE_RULES}

${langLine}
TEXT:
${text}
`.trim();
}