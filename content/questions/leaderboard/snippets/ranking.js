// Three ways to number tied players. Entries are { id, score, at }: `at` is when the player
// reached this score (smaller = earlier). Every function returns rows sorted best-first.

// Highest score first; among equals, whoever got there first; the id makes the order total.
export const byScoreThenTime = (a, b) => b.score - a.score || a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Competition ranking, "1224": 1 + how many have strictly more. Redis: 1 + ZCOUNT key (score +inf
export function competitionRanks(entries) {
  const sorted = [...entries].sort(byScoreThenTime);
  let rank = 0;
  return sorted.map((e, i) => {
    if (i === 0 || e.score !== sorted[i - 1].score) rank = i + 1;
    return { ...e, rank };
  });
}

// Dense ranking, "1223": 1 + how many distinct scores are higher. Needs a second sorted set of
// distinct scores in Redis, because ZCOUNT counts players, not values.
export function denseRanks(entries) {
  const sorted = [...entries].sort(byScoreThenTime);
  let rank = 0;
  return sorted.map((e, i) => {
    if (i === 0 || e.score !== sorted[i - 1].score) rank++;
    return { ...e, rank };
  });
}

// Unique ranking, "1234": ties go to whoever reached the score first. In Redis this is plain
// ZREVRANK + 1 on a composite score (see tie-score.js).
export const uniqueRanks = entries => [...entries].sort(byScoreThenTime).map((e, i) => ({ ...e, rank: i + 1 }));

const RULES = { competition: competitionRanks, dense: denseRanks, unique: uniqueRanks };
export const rankWith = (rule, entries) => RULES[rule](entries);

export const topK = (entries, k, rule = 'competition') => rankWith(rule, entries).slice(0, k);

// The players around `id`: `radius` above and below. Near either end, the window slides
// instead of shrinking, so the screen always shows 2 × radius + 1 rows when the board has them.
export function aroundMe(ranked, id, radius = 5) {
  const pos = ranked.findIndex(r => r.id === id);
  if (pos < 0) return [];                                     // no score in this period yet
  const size = 2 * radius + 1;
  const start = Math.max(0, Math.min(pos - radius, ranked.length - size));
  return ranked.slice(start, start + size);
}
