import type { DoodleName } from "@/components/doodle/names";
import type { ArchNodeId } from "./design";

/** What you learn when you click a component in the architecture lab. */
export interface Concept {
  id: ArchNodeId;
  /** The plain name: "Load balancer". */
  name: string;
  /** What it is, in one or two sentences a newcomer follows. At most 40 words. */
  what: string;
  /** The problem that makes you add it: what hurts without it. At most 40 words. */
  why: string;
  /** When NOT to add it: the honest answer. At most 35 words. */
  whenNot: string;
  /** Exactly three trade-offs, each "A vs B: ...", at most 25 words. */
  tradeoffs: string[];
  /** The sentence to say in an interview, first person, at most 35 words. */
  say: string;
  /** What an interviewer will ask next, as a question, at most 20 words. */
  followUp: string;
  /** Real products people reach for: 2 to 4 names, e.g. ["NGINX", "HAProxy", "AWS ALB"]. */
  examples: string[];
  /** Links into the site: 1 to 3, each a real page path (lesson, deep dive or question). */
  learn: { href: string; label: string }[];
  doodle?: DoodleName;
}
