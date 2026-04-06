export const mockAiOutput = [
  {
    type: 'key_point',
    title: 'Core Concept',
    content:
      'The system transforms dense language into simpler phrasing by identifying intent first, then rewriting sentence structure while preserving meaning and factual constraints.',
  },
  {
    type: 'warning',
    title: 'Watch for ambiguity',
    content:
      'If source text uses jargon without definition, simplification can remove precision. Keep domain terms where necessary and attach short plain-language clarifications.',
  },
  {
    type: 'flow',
    title: 'Simplification pipeline',
    extra: ['Ingest', 'Parse', 'Simplify', 'Review', 'Deliver'],
  },
  {
    type: 'bullet',
    title: 'What changed',
    items: [
      'Complex clauses become shorter direct sentences',
      'Uncommon words are replaced with plain alternatives',
      'Long paragraphs are broken into clear chunks',
    ],
  },
  {
    type: 'text',
    title: 'Context',
    content:
      'This output is dynamic and may include mixed block types, varying lengths, and unknown structures. The renderer adapts instead of forcing fixed dashboard sections.',
  },
  {
    type: 'unknown_signal',
    title: 'Model Metadata',
    content:
      'Confidence: high. This demonstrates fallback rendering for unsupported block types so UI remains stable in production scenarios.',
  },
];
