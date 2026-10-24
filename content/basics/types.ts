// The "Start here" card at the top of every detail page: what the topic is, why it is used, a real-life example and when
// to reach for it, in four short pieces the reader flips between. One file per section of the site (learn.ts,
// deep-dives.ts, questions.ts, patterns.ts, lld.ts, cs.ts), each exporting `export const basics: Record<pageSlug, Basics>`.
// The patterns and questions have extra files (patterns-a.ts, questions-a.ts...) so several people can write at once.

export interface Basics {
  /** What it is, in plain words, at most 45 words. Define the term before using it. */
  what: string;
  /** Why it exists: the pain it removes, at most 45 words. Use a number if there is one. */
  why: string;
  /** A real-life example that maps cleanly onto the idea, at most 45 words. */
  example: string;
  /** When to reach for it (and, where useful, when not to), at most 40 words. */
  when: string;
}

export const BASICS_TABS = ["what", "why", "example", "when"] as const;
export type BasicsTab = (typeof BASICS_TABS)[number];
export const BASICS_LABEL: Record<BasicsTab, string> = { what: "What it is", why: "Why use it", example: "Real-life example", when: "When to use it" };
