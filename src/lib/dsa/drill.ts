// "Which pattern is this?" drill: a problem's summary, four pattern choices, and the signals that give it away.
// Pure functions so the deck can be tested; the UI is src/components/dsa/PatternDrill.tsx.
import { mulberry32 } from "@/lib/rng";

export interface DrillRow {
  slug: string;
  title: string;
  summary: string;
  difficulty: string;
  /** Pattern slugs; the first is the one the problem is mainly about. */
  patterns: string[];
}

export interface DrillPattern {
  slug: string;
  group: string;
}

export interface DrillQuestion {
  slug: string;
  title: string;
  summary: string;
  difficulty: string;
  /** The pattern slug that is the right answer. */
  answer: string;
  /** Four pattern slugs, the answer among them. */
  options: string[];
}

/** Technique names. A summary that says "stack" or "binary search" already gave the answer away, so it is not used. */
const GIVEAWAY =
  /\b(heaps?|priority queues?|tries|trie|prefix (sums?|tree)|two[- ]pointers?|sliding windows?|binary search|monotonic|stacks?|union[- ]find|disjoint[- ]set|topological|backtrack\w*|greedy|dynamic programming|memoi[sz]\w*|bfs|dfs|breadth-first|depth-first|hash (maps?|sets?|tables?)|bitmasks?|xor)\b/i;

export const isGiveaway = (summary: string) => GIVEAWAY.test(summary);

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A deck of `size` questions, deterministic for a seed. Problems are spread across patterns (round-robin over a shuffled
 * pattern order) so a round does not circle one topic, and the wrong options come from the answer's own group first,
 * because those are the patterns people actually mix up.
 */
export function buildDeck(rows: DrillRow[], patterns: DrillPattern[], seed: number, size = 10): DrillQuestion[] {
  const rand = mulberry32(seed);
  const eligible = rows.filter((r) => r.patterns.length > 0 && !isGiveaway(r.summary));
  const byPattern = new Map<string, DrillRow[]>();
  for (const r of eligible) byPattern.set(r.patterns[0], [...(byPattern.get(r.patterns[0]) ?? []), r]);
  for (const [k, v] of byPattern) byPattern.set(k, shuffle(v, rand));

  const order = shuffle([...byPattern.keys()], rand);
  const picked: DrillRow[] = [];
  for (let round = 0; picked.length < size && round < 50; round++) {
    let added = false;
    for (const p of order) {
      const row = byPattern.get(p)?.[round];
      if (row && picked.length < size) {
        picked.push(row);
        added = true;
      }
    }
    if (!added) break;
  }

  const groupOf = new Map(patterns.map((p) => [p.slug, p.group]));
  return picked.map((r) => {
    const answer = r.patterns[0];
    const others = patterns.filter((p) => p.slug !== answer);
    const near = shuffle(others.filter((p) => p.group === groupOf.get(answer)), rand);
    const far = shuffle(others.filter((p) => p.group !== groupOf.get(answer)), rand);
    const options = shuffle([answer, ...[...near, ...far].slice(0, 3).map((p) => p.slug)], rand);
    return { slug: r.slug, title: r.title, summary: r.summary, difficulty: r.difficulty, answer, options };
  });
}
