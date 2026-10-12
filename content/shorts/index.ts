// Every short, mixed into one feed. Each file owns one part of the site:
//   system-design.ts          the HLD path (content/learn)
//   deep-dives-questions.ts   deep dives and interview questions
//   dsa.ts                    DSA patterns and the JavaScript cheat sheet
//   building-blocks*.ts       standalone concepts: data structures and storage, distributed systems, platform
import type { Short, ShortTrack } from "./types";
import { shorts as systemDesign } from "./system-design";
import { shorts as deepDivesQuestions } from "./deep-dives-questions";
import { shorts as dsa } from "./dsa";
import { shorts as blocksData } from "./building-blocks";
import { shorts as blocksDistributed } from "./building-blocks-distributed";
import { shorts as blocksPlatform } from "./building-blocks-platform";

export type { Short, ShortMore, ShortTrack } from "./types";

export const SHORT_TRACKS: ShortTrack[] = ["System design", "Building blocks", "DSA", "JavaScript"];

/** Round-robin across the source lists so the feed alternates topics instead of reading like a chapter. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

const dsaPatterns = dsa.filter((s) => s.track === "DSA");
const javascript = dsa.filter((s) => s.track === "JavaScript");
const buildingBlocks = interleave([blocksData, blocksDistributed, blocksPlatform]);

export const shorts: Short[] = interleave([systemDesign, dsaPatterns, buildingBlocks, deepDivesQuestions, javascript]);

export const getShort = (id: string) => shorts.find((s) => s.id === id);
