// Extra, structured material for each detail page, kept next to the page rather than inside the MDX. One file per
// section of the site (learn.ts, deep-dives.ts, questions.ts, patterns.ts, lld.ts), each exporting
// `export const extras: Record<slug, PageExtras>` keyed by the page's registry slug.
//
// What each part is for (see docs/AUTHORING-EXTRAS.md):
//   detail   which `##` sections fold away in the default "Core" view, so the page is a short spine you can read in a
//            few minutes, with everything else one click away
//   sayIt    the 30-second version you would say in the interview: an answer, three numbers, three trade-offs, and the
//            one thing to bring up before they ask
//   explain  (questions only) the prompts for "Explain it back": a guided five-step answer you write or say, then
//            compare with a checklist
//   doodle   the picture at the top of the page
import type { DoodleName } from "@/components/doodle/names";
import type { PrimerId } from "../primers/types";
import type { Basics } from "../basics/types";
import type { PageChecks } from "../checks/types";
import type { Story } from "../stories/types";

export interface SayIt {
  /** What you would say if you had 30 seconds: 2 or 3 sentences, first person, at most 70 words. */
  answer: string;
  /** Exactly three numbers worth having in your head. `value` is short ("~1.2 MB/day"), `label` says what it is. */
  numbers: { value: string; label: string }[];
  /** Exactly three trade-offs, each "A vs B: what you give up and what you get", at most 25 words. */
  tradeoffs: string[];
  /** The one failure or edge case to raise before the interviewer asks, one sentence. */
  mention: string;
}

export type ExplainStepId = "clarify" | "estimate" | "interface" | "design" | "deepdive";

export interface ExplainStep {
  id: ExplainStepId;
  /** What to do in this step, specific to the question, at most 25 words. */
  prompt: string;
  /** A nudge shown on request, one sentence, taken from the page. */
  hint: string;
}

export interface Explain {
  /** Exactly five, in the order clarify, estimate, interface, design, deepdive. */
  steps: ExplainStep[];
  /** 6 to 8 things a strong answer includes, each one observable ("Names the double-booking race"), at most 14 words. */
  checklist: string[];
}

export interface PageExtras {
  /** Section ids (the slug of the `##` heading) that fold away in the Core view. */
  detail: string[];
  sayIt: SayIt;
  explain?: Explain;
  doodle?: DoodleName;
  /** The step-by-step walkthrough the page opens on (content/stories). Filled in by getExtras, never written here. */
  story?: Story;
  /** The "What is X?" primer shown at the top of the page, for pages about one core idea. */
  primer?: PrimerId;
  /** One tap-to-answer question per section card (content/checks). Filled in by getExtras, never written here. */
  checks?: PageChecks;
  /** The "Start here" card: what it is, why, an example and when (content/basics). Filled in by getExtras. */
  basics?: Basics;
}

export const EXPLAIN_STEPS: ExplainStepId[] = ["clarify", "estimate", "interface", "design", "deepdive"];
export const EXPLAIN_STEP_LABEL: Record<ExplainStepId, string> = {
  clarify: "Clarify",
  estimate: "Estimate",
  interface: "Interface",
  design: "Design",
  deepdive: "Deep dive",
};
