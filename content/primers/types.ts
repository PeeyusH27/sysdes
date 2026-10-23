// A primer: "What is X?" in about a minute, for someone who has never met X. One animated scene with a "before" and an
// "after", a picture from everyday life, three things to remember, and where to go next. Written for a smart person
// who has built things but not studied distributed systems. See docs/AUTHORING-PRIMERS.md.
import type { DoodleName } from "@/components/doodle/names";
import type { FlowSpec } from "@/components/diagram/types";

export const PRIMER_IDS = [
  "cache", "load-balancer", "replication", "sharding", "consistent-hashing", "queue", "cdn", "db-index", "rate-limiter",
  "cap", "circuit-breaker", "idempotency", "realtime", "pub-sub", "api-gateway", "bloom-filter", "connection-pool", "sql-nosql",
] as const;
export type PrimerId = (typeof PRIMER_IDS)[number];

export interface Primer {
  id: PrimerId;
  /** "What is a cache?" */
  title: string;
  /** The whole idea in one sentence of everyday words. At most 22 words. It must make sense to someone who does not know the term. */
  idea: string;
  /** The picture from everyday life, as a doodle name, and one sentence tying it to the idea. At most 28 words. */
  doodle: DoodleName;
  analogy: string;
  /**
   * The animation. A FlowSpec whose scenarios are, in order: "Without it" (the problem, showing what hurts), "With it"
   * (the idea working), and optionally a third ("When it goes wrong" or a variant). Captions are one short sentence in
   * plain words, at most 16 words each, narrating what is happening to a request.
   */
  flow: FlowSpec;
  /** Exactly three things to remember, each at most 12 words, each a full thought ("It trades freshness for speed."). */
  remember: string[];
  /** When you reach for it, one sentence, at most 22 words. */
  whenToUse: string;
  /** The catch: what it costs or where it bites, one sentence, at most 22 words. */
  theCatch: string;
  /** What to say in an interview, first person, at most 30 words. */
  say: string;
  /** Real pages to read next: 1 to 3, each an existing /learn, /deep-dives or /questions path. */
  learnMore: { href: string; label: string }[];
}
