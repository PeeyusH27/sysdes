import { dsaArts } from "./art/dsa";
import { lldArts } from "./art/lld";
import { systemArtsA } from "./art/system-a";
import { systemArtsB } from "./art/system-b";
import { systemArtsC } from "./art/system-c";
import type { DoodleArt } from "./types";

/** Every drawn doodle by name. Missing art renders nothing; tests/doodle.test.ts fails if a listed name has none. */
export const arts: Record<string, DoodleArt> = { ...systemArtsA, ...systemArtsB, ...systemArtsC, ...lldArts, ...dsaArts };
