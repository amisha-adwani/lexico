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

  if (matchesAny(processPatterns)) {
    return 'process';
  }

  if (matchesAny(timelinePatterns)) {
    return 'timeline';
  }

  if (matchesAny(comparisonPatterns)) {
    return 'comparison';
  }

  return 'concept';
}
