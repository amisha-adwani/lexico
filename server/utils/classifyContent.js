export default function classifyContent(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return 'concept';
  }

  const normalized = text.toLowerCase();

  const processPatterns = [
    /\b(step|steps|phase|phases|stage|stages)\b/,
    /\b(first|second|third|fourth|next|then|after that|before that|finally|subsequently|subsequent|initially|ultimately)\b/,
  ];

  const timelinePatterns = [
    /\b(19|20)\d{2}\b/,
    /\b(in|by|since|after|before)\s+(19|20)\d{2}\b/,
    /\b(history|historical|timeline|year|years|dated|dated to)\b/,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
  ];

  const comparisonPatterns = [
    /\b(vs|versus|compared to|comparison|compare|contrast|on the other hand|difference between|pros and cons|better than|worse than|similar to|unlike)\b/,
  ];

  const matchesAny = (patterns) => patterns.some((pattern) => pattern.test(normalized));

  let candidate = null;
  if (matchesAny(processPatterns)) {
    candidate = 'process';
  } else if (matchesAny(timelinePatterns)) {
    candidate = 'timeline';
  } else if (matchesAny(comparisonPatterns)) {
    candidate = 'comparison';
  } else {
    candidate = 'concept';
  }

  const wordCount = text.split(/\s+/).length;
  const conceptOverridePatterns = [
    /\b(types? of|kinds? of|categories? of|branches? of|divided into|consists? of|includes?)\b/i,
    /\b(paradigm|approach|method|technique|algorithm)\b/i,
  ];
  const hasConceptStructure = conceptOverridePatterns.some((p) => p.test(text));

  if (candidate === 'process' && wordCount > 500 && hasConceptStructure) {
    return 'concept';
  }

  return candidate;
}
