// A short is one idea you can read in about a minute: a hook and 3–5 bullets on the first screen,
// then a few "go deeper" groups the reader reaches by scrolling down.
// System design, DSA and JavaScript shorts summarise a lesson section and link back to it, so they must agree
// with that page. Building blocks shorts stand alone (Bloom filters, gossip, LSM trees…): they link to the
// closest lesson section when there is one.

export type ShortTrack = "System design" | "DSA" | "JavaScript" | "Building blocks" | "CS fundamentals";

export interface ShortMore {
  /** Small heading for the group, e.g. "How it works", "Watch out", "Example". */
  title: string;
  /** 2–5 bullets. Inline `code` and **bold** are rendered; nothing else is. */
  points: string[];
}

export interface Short {
  /** kebab-case, unique across all files; used in the URL as /shorts?s=<id>. */
  id: string;
  track: ShortTrack;
  /** Chip label, 1–3 words: "Caching", "Two pointers", "Map and Set". */
  topic: string;
  /** The headline, at most 70 characters. Phrase it as the idea, not the chapter name. */
  title: string;
  /** One sentence on why it matters, at most 150 characters. */
  hook: string;
  /** 3–5 bullets for the first screen, each at most 150 characters. */
  points: string[];
  /** 1–3 groups revealed when the reader scrolls down. */
  more: ShortMore[];
  /** Optional JavaScript, at most 10 lines and 70 columns. */
  code?: string;
  /** Optional one-liner to say in an interview, at most 220 characters. */
  say?: string;
  /**
   * The page (and optional #section) this short summarises, e.g. "/learn/caching#eviction-and-ttl".
   * Required except on Building blocks shorts, where it is the closest related section, if any.
   */
  source?: string;
}
