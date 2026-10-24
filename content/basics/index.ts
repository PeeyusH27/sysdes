import { basics as cs } from "./cs";
import { basics as dives } from "./deep-dives";
import { basics as learn } from "./learn";
import { basics as lld } from "./lld";
import { basics as patternsFirst } from "./patterns";
import { basics as patternsA } from "./patterns-a";
import { basics as patternsB } from "./patterns-b";
import { basics as questionsFirst } from "./questions";
import { basics as questionsA } from "./questions-a";
import { basics as questionsB } from "./questions-b";
import type { Basics } from "./types";

export type { Basics, BasicsTab } from "./types";
export { BASICS_LABEL, BASICS_TABS } from "./types";

export type BasicsSection = "learn" | "deep-dives" | "questions" | "patterns" | "lld" | "cs";
const patterns = { ...patternsFirst, ...patternsA, ...patternsB };
const questions = { ...questionsFirst, ...questionsA, ...questionsB };
const bySection: Record<BasicsSection, Record<string, Basics>> = { learn, "deep-dives": dives, questions, patterns, lld, cs };

export const getBasics = (section: BasicsSection, slug: string): Basics | undefined => bySection[section][slug];
export const allBasics = bySection;
