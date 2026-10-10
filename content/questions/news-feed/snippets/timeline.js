// Pure helpers for the read path (feed.js). No Redis here, so they are easy to test.

// Redis WITHSCORES replies are flat: [id, score, id, score…] → [{ id, ts }]
export const pairs = flat => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ id: flat[i], ts: Number(flat[i + 1]) });
  return out;
};

// Merge the user's pushed feed page with one page from each followed celebrity's timeline:
// newest first, one entry per post, at most `limit`. A post can be in both lists when an author
// recently crossed the celebrity threshold, hence the dedupe.
export function mergeTimelines(pushed, pulled, limit) {
  const seen = new Set();
  return [pushed, ...pulled]
    .flatMap(pairs)
    .sort((a, b) => b.ts - a.ts)
    .filter(e => !seen.has(e.id) && seen.add(e.id))
    .slice(0, limit);
}
