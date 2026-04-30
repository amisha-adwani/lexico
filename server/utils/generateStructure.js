function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}

export default function generateStructure(contentType, text) {
  switch (contentType) {
    case 'process':
      return generateFlow(text);
    case 'timeline':
      return generateTimeline(text);
    case 'comparison':
      return generateComparison(text);
    case 'concept':
    default:
      return generateMindmap(text);
  }
}

function generateMindmap(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'and', 'or', 'but', 'if', 'then',
    'else', 'when', 'where', 'why', 'how', 'what', 'who', 'which', 'that',
    'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
    'their', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'among', 'over', 'under', 'again', 'further', 'then', 'once'
  ]);
  const filtered = words.filter(word => word.length > 2 && !stopwords.has(word));
  const freq = {};
  filtered.forEach(word => freq[word] = (freq[word] || 0) + 1);
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([word]) => word);
  const buckets = [];
  for (let i = 0; i < sorted.length; i += 4) {
    buckets.push(sorted.slice(i, i + 4));
  }
  const nodes = buckets.map((bucket, index) => ({
    label: `Category ${index + 1}`,
    children: bucket
  }));
  return {
    type: 'visual',
    visualType: 'mindmap',
    title: 'Main Topic',
    nodes
  };
}

function generateFlow(text) {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
  const steps = sentences.slice(0, 5).map(s => truncate(s, 50));
  return {
    type: 'visual',
    visualType: 'flow',
    title: 'Process Overview',
    steps
  };
}

function generateTimeline(text) {
  const dateRegex = /\b(19|20)\d{2}\b/g;
  const dates = text.match(dateRegex) || [];
  const points = dates.map(date => {
    const index = text.indexOf(date);
    const desc = text.slice(Math.max(0, index - 50), index + 50).replace(/\s+/g, ' ').trim();
    return {
      label: `Event in ${date}`,
      time: date,
      desc
    };
  });
  return {
    type: 'visual',
    visualType: 'timeline',
    title: 'Timeline',
    points
  };
}

function generateComparison(text) {
  const parts = text.split(/\b(vs|versus|compared to|on the other hand)\b/i);
  const items = [];
  if (parts.length >= 3) {
    items.push({
      label: 'Side A',
      points: parts[0].split(/[.!?]+/).map(s => s.trim()).filter(s => s).slice(0, 3)
    });
    items.push({
      label: 'Side B',
      points: parts[2].split(/[.!?]+/).map(s => s.trim()).filter(s => s).slice(0, 3)
    });
  } else {
    items.push({ label: 'Side A', points: ['Point 1'] });
    items.push({ label: 'Side B', points: ['Point 2'] });
  }
  return {
    type: 'visual',
    visualType: 'comparison',
    title: 'Comparison',
    items
  };
}

