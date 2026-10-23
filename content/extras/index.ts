import { extras as dives } from "./deep-dives";
import { extras as learn } from "./learn";
import { extras as lld } from "./lld";
import { extras as patterns } from "./patterns";
import { extras as questions } from "./questions";
import { getStory } from "../stories";
import type { PageExtras } from "./types";

export type { Explain, ExplainStep, ExplainStepId, PageExtras, SayIt } from "./types";
export { EXPLAIN_STEPS, EXPLAIN_STEP_LABEL } from "./types";

export type ExtrasSection = "learn" | "deep-dives" | "questions" | "patterns" | "lld";
const bySection: Record<ExtrasSection, Record<string, PageExtras>> = { learn, "deep-dives": dives, questions, patterns, lld };

export const getExtras = (section: ExtrasSection, slug: string): PageExtras | undefined => {
  const e = bySection[section][slug];
  const story = e && getStory(section, slug);
  return story ? { ...e, story } : e;
};
export const allExtras = bySection;
