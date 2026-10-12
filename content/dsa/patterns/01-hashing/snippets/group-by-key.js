// Template 4: group by a canonical key. Items that should end up together must map to the same key:
// a length, a sorted string, a count signature, an encoded coordinate…
export function groupBy(items, keyOf) {
  const groups = new Map();   // key → items with that key, in input order
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}
