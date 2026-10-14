"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type DsaProgress = {
  /** slug → time first solved */
  solved: Record<string, number>;
  /** slug → number of submissions that did not pass */
  failed: Record<string, number>;
  /** slug → number of submissions */
  submits: Record<string, number>;
  recordSubmit: (slug: string, passed: boolean) => void;
  toggleSolved: (slug: string) => void;
};

export const useDsa = create<DsaProgress>()(
  persist(
    (set) => ({
      solved: {},
      failed: {},
      submits: {},
      recordSubmit: (slug, passed) =>
        set((s) => ({
          submits: { ...s.submits, [slug]: (s.submits[slug] ?? 0) + 1 },
          failed: passed ? s.failed : { ...s.failed, [slug]: (s.failed[slug] ?? 0) + 1 },
          solved: passed && !s.solved[slug] ? { ...s.solved, [slug]: Date.now() } : s.solved,
        })),
      toggleSolved: (slug) =>
        set((s) => {
          const solved = { ...s.solved };
          if (solved[slug]) delete solved[slug];
          else solved[slug] = Date.now();
          return { solved };
        }),
    }),
    { name: "sds-dsa", version: 1 },
  ),
);

/** The languages the practice editor runs. */
export type DraftLang = "js" | "python";

/**
 * Drafts are kept apart from progress so typing never re-renders lists that read `solved`. Each language has its own
 * draft per problem; `code` holds JavaScript (the name predates Python, so existing saves keep working).
 */
type Drafts = {
  code: Record<string, string>;
  python: Record<string, string>;
  /** The language the editor uses when the site-wide choice is Java (which can't run in the browser here). */
  javaFallback: DraftLang;
  save: (slug: string, code: string, lang?: DraftLang) => void;
  clear: (slug: string, lang?: DraftLang) => void;
  setJavaFallback: (lang: DraftLang) => void;
};

const field = (lang: DraftLang) => (lang === "python" ? "python" : "code");

export const useDrafts = create<Drafts>()(
  persist(
    (set) => ({
      code: {},
      python: {},
      javaFallback: "js",
      save: (slug, code, lang = "js") => set((s) => ({ [field(lang)]: { ...s[field(lang)], [slug]: code } })),
      clear: (slug, lang = "js") =>
        set((s) => {
          const next = { ...s[field(lang)] };
          delete next[slug];
          return { [field(lang)]: next };
        }),
      setJavaFallback: (javaFallback) => set({ javaFallback }),
    }),
    {
      name: "sds-dsa-drafts",
      version: 1,
      // Saves from before Python have only `code`: keep it and start the rest empty.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Drafts>;
        return {
          ...current,
          code: p.code && typeof p.code === "object" ? p.code : {},
          python: p.python && typeof p.python === "object" ? p.python : {},
          javaFallback: p.javaFallback === "python" ? "python" : "js",
        };
      },
    },
  ),
);
