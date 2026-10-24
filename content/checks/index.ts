import { checks as cs } from "./cs";
import { checks as dives } from "./deep-dives";
import { checks as learn } from "./learn";
import { checks as lld } from "./lld";
import { checks as patterns } from "./patterns";
import { checks as questions } from "./questions";
import type { PageChecks } from "./types";

export type { CardCheck, PageChecks } from "./types";

export type ChecksSection = "learn" | "deep-dives" | "questions" | "patterns" | "lld" | "cs";
const bySection: Record<ChecksSection, Record<string, PageChecks>> = { learn, "deep-dives": dives, questions, patterns, lld, cs };

export const getChecks = (section: ChecksSection, slug: string): PageChecks | undefined => bySection[section][slug];
export const allChecks = bySection;
