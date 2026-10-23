// A story is the page told as a walkthrough in two parts. Part 1, "Understand it" (`learn`), teaches the topic from zero,
// step by step, each step with a real example. Part 2 (`steps`) is the animated walkthrough: one picture and one short
// line per step, so the idea is seen running. Pages with a story open on it; the written lesson is one click away.
// Authoring guide: docs/AUTHORING-STORIES.md. Limits are enforced by tests/stories.test.ts.
import type { TraceSpec } from "@/components/algo/types";
import type { ClassSpec, FlowSpec } from "@/components/diagram/types";
import type { DoodleName } from "@/components/doodle/names";

export type Tone = "good" | "bad" | "warn" | "info";

/** What a step is for. A story starts with a `pain` and ends with a `catch` or a `skip`. */
export type StepTag = "pain" | "idea" | "sum" | "choose" | "fix" | "catch" | "skip";

export type Scene =
  /** A big hand-drawn picture. At most two per story. */
  | { kind: "doodle"; name: DoodleName }
  /** An existing animated diagram, playing one of its scenarios (the scenario must exist on the spec). */
  | { kind: "flow"; spec: FlowSpec; scenario: string }
  /** A DSA pattern's own step-through animation (a trace from its viz.ts), looping, with no controls or code. `preset` is the label of the input to play. */
  | { kind: "trace"; trace: TraceSpec; preset?: string }
  /** A class diagram at one stage of its build-up (the spec must have `stages`; `stage` counts from 0). One stage per step. */
  | { kind: "classes"; spec: ClassSpec; stage: number }
  /** "Do the sum first": rows appear one by one, then the result, then a verdict stamp. */
  | { kind: "sum"; rows: { label: string; value: string }[]; result: { label: string; value: string }; verdict: { text: string; tone: Tone } }
  /** Bars that grow: compare numbers at a glance. `value` is a plain number, `shown` the label (e.g. "6 ms"). */
  | { kind: "bars"; bars: { label: string; value: number; shown: string; tone?: Tone }[] }
  /** A list of options, each marked good, bad or so-so with a very short reason. */
  | { kind: "verdicts"; items: { label: string; tone: Tone; why: string }[] }
  /** Two columns: what goes wrong, what fixes it (or before and after). */
  | { kind: "versus"; left: { title: string; points: string[] }; right: { title: string; points: string[] } }
  /** A slider the reader drags; the verdict changes with the number. `stops` are checked in order by `upTo`. */
  | { kind: "meter"; label: string; unit: string; min: number; max: number; start: number; log?: boolean; stops: { upTo: number; verdict: string; tone: Tone }[] };

export interface Predict {
  /** "What do you think happens?" One short question. */
  q: string;
  options: string[];
  answer: number;
  /** One short sentence shown after the reader picks. */
  why: string;
}

export interface StoryStep {
  tag: StepTag;
  /** The step's title, at most 6 words. */
  head: string;
  /** What to notice, at most 18 words. */
  line: string;
  scene: Scene;
  /** Optional: ask before showing the answer. 1 to 3 per story. */
  predict?: Predict;
}

/**
 * One step of "Understand it", the part of the walkthrough that comes first: the idea explained from zero, in plain
 * words, with a real example. Written like a patient friend talking, not like a spec.
 */
export interface LearnStep {
  /** The step's title, at most 7 words. A question or a plain statement ("What a cache is"). */
  head: string;
  /** The explanation, 2 or 3 short sentences, at most 45 words. Say the thing before you name it. */
  body: string;
  /** What the example is, in a few words ("A notepad on your desk"). At most 6 words. */
  eg: string;
  /** The real example: an everyday situation or a real product, tied to the idea, at most 38 words. */
  example: string;
  /** An optional hand-drawn picture to sit beside the example. */
  doodle?: DoodleName;
}

export interface Story {
  /** "Understand it": 3 to 6 steps that teach the topic first, each with a real example. Shown before `steps`. */
  learn?: LearnStep[];
  steps: StoryStep[];
}
