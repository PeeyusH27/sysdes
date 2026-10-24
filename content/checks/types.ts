// One tap-to-answer question per section card, kept next to the page rather than inside the MDX. One file per section
// of the site (learn.ts, deep-dives.ts, questions.ts, patterns.ts, lld.ts, cs.ts), each exporting
// `export const checks: Record<pageSlug, Record<sectionId, CardCheck>>`. A section id is the slug of its `##` heading.
// The question is shown at the foot of the card in the reader, so it must be answerable from that card alone.

export interface CardCheck {
  /** The question, at most 14 words. */
  q: string;
  /** 2 or 3 choices, each at most 8 words. */
  options: string[];
  /** Index of the right choice. Vary it: the right answer is not always first. */
  answer: number;
  /** Why, at most 22 words. Shown after the reader picks, right or wrong. */
  why: string;
}

export type PageChecks = Record<string, CardCheck>;
