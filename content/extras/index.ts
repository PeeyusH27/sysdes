import { extras as cs } from "./cs";
import { extras as dives } from "./deep-dives";
import { extras as learn } from "./learn";
import { extras as lld } from "./lld";
import { extras as patterns } from "./patterns";
import { extras as questionsFirst } from "./questions";
import { extras as questionsHld } from "./questions-hld";
import { extras as questionsLld } from "./questions-lld";
import { getBasics } from "../basics";
import { getChecks } from "../checks";
import { getStory } from "../stories";
import type { PageExtras } from "./types";

export type { Explain, ExplainStep, ExplainStepId, PageExtras, SayIt } from "./types";
export { EXPLAIN_STEPS, EXPLAIN_STEP_LABEL } from "./types";

export type ExtrasSection = "learn" | "deep-dives" | "questions" | "patterns" | "lld" | "cs";
const questions: Record<string, PageExtras> = { ...questionsFirst, ...questionsHld, ...questionsLld };
const bySection: Record<ExtrasSection, Record<string, PageExtras>> = { learn, "deep-dives": dives, questions, patterns, lld, cs };

export const getExtras = (section: ExtrasSection, slug: string): PageExtras | undefined => {
  const e = bySection[section][slug];
  const story = e && getStory(section, slug);
  const checks = e && getChecks(section, slug);
  const basics = e && getBasics(section, slug);
  return story || checks || basics ? { ...e, ...(story && { story }), ...(checks && { checks }), ...(basics && { basics }) } : e;
};
export const allExtras = bySection;
