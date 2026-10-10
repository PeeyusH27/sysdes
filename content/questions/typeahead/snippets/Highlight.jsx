// Highlight.jsx: no innerHTML; React escapes every piece
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // "c++" must match literally

// Pure and testable: ('React Native', 're') -> [{ text: 'Re', match: true }, { text: 'act Native', match: false }]
export function splitHighlight(text, query) {
  const q = query.trim();
  if (!q) return text ? [{ text, match: false }] : [];
  return text
    .split(new RegExp(`(${escapeRegExp(q)})`, 'ig'))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))         // a capture group puts every match at an odd index
    .filter(part => part.text);                                       // drop the empty strings split leaves at the edges
}

export function Highlight({ text, query }) {
  return splitHighlight(text, query).map((part, i) => (part.match ? <mark key={i}>{part.text}</mark> : part.text));
}
