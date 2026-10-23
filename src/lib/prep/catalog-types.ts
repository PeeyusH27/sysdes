// Types and constants shared by the browser and the server. Nothing here reads files, so client components can import it
// (the catalog itself, which reads problems from disk, is built in catalog.ts and only on the server).

export type Track = "dsa" | "hld" | "lld";
export const TRACKS: Track[] = ["dsa", "hld", "lld"];
export const TRACK_LABEL: Record<Track, string> = { dsa: "Coding (DSA)", hld: "High-level design", lld: "Low-level design" };

export interface CatalogItem {
  slug: string;
  /** Where solved state is stored: the slug for a problem, `lld:<slug>` for an exercise. */
  key: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  minutes: number;
  href: string;
}

export interface Catalog {
  patterns: { slug: string; title: string; short: string; group: string; minutes: number; problems: CatalogItem[] }[];
  learn: { slug: string; title: string; minutes: number }[];
  deepDives: { slug: string; title: string; minutes: number }[];
  questions: { slug: string; title: string; label: string; level: string; minutes: number; lld: boolean; challenge?: string; exercises: string[]; /** Has an "Explain it back" rehearsal. */ explain: boolean }[];
  lldLessons: { slug: string; title: string; short: string; minutes: number; exercises: CatalogItem[] }[];
  exercises: CatalogItem[];
  challenges: { slug: string; title: string; missionSteps: number; learn: string }[];
}

/** How long a practice item takes, in minutes, by difficulty. Deliberately honest, not optimistic. */
export const PROBLEM_MINUTES = { Easy: 15, Medium: 25, Hard: 40 } as const;
export const EXERCISE_MINUTES = { Easy: 20, Medium: 35, Hard: 50 } as const;
