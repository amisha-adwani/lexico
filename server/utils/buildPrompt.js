export default function buildPrompt({ text, language, visualSkeleton }) {
    const languageLine = language ? `Language: ${language}\n` : "";
    const skeletonLine = visualSkeleton ? `VISUAL STRUCTURE TEMPLATE:\n${JSON.stringify(visualSkeleton, null, 2)}\n\nYou are a content extraction assistant. You will receive a JSON structure and a block of text. Fill in the JSON fields with relevant content from the text. Never change the JSON shape, never add or remove keys. Fill in the following visual structure with relevant labels and content from the text. Do not change the structure shape.\n\n` : "";
  
    if (visualSkeleton) {
      return `
  You are a content extraction assistant. You will receive a JSON structure and a block of text. Fill in the JSON fields with relevant content from the text. Never change the JSON shape, never add or remove keys.
  
  VISUAL STRUCTURE TEMPLATE:
  ${JSON.stringify(visualSkeleton, null, 2)}
  
  Fill in the labels and content fields in this structure with relevant information from the text. Do not change the structure shape, keys, or add/remove fields.
  IMPORTANT: The nodes array must contain EXACTLY the same number of nodes as the template above — do not add more nodes.
  
  Return an array of blocks, including exactly one 'visual' block that is the filled structure above, and other blocks as usual.
  
  CRITICAL RULES:
  - Return ONLY valid JSON array
  - Do NOT include markdown (no \`\`\`)
  - Do NOT include explanations or extra text
  - Output must be directly JSON.parse-able
  - Return an array with 3 to 7 blocks
  - The 'visual' block must be the filled template
  
  ${languageLine}
  TEXT:
  ${text}
  `;
    }
  
    return `
  You are an assistant that converts complex text into structured, visual-first content blocks for a dynamic UI.
  
  CRITICAL RULES:
  - Return ONLY valid JSON
  - Do NOT include markdown (no \`\`\`)
  - Do NOT include explanations or extra text
  - Output must be directly JSON.parse-able
  - Return an array with 3 to 7 blocks
  If output is not valid JSON, fix it before returning.
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
  For mindmap, the nodes array must be a maximum of 3-5 TOP LEVEL nodes only. Each top level node has children as strings. Do NOT repeat sub-categories as separate top-level nodes. Wrong: 14 flat nodes all at same level. Correct: 3-5 parent nodes each with 2-5 string children.
  
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
