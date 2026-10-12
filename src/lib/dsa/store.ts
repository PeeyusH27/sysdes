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

/** Drafts are kept apart from progress so typing never re-renders lists that read `solved`. */
type Drafts = {
  code: Record<string, string>;
  save: (slug: string, code: string) => void;
  clear: (slug: string) => void;
};

export const useDrafts = create<Drafts>()(
  persist(
    (set) => ({
      code: {},
      save: (slug, code) => set((s) => ({ code: { ...s.code, [slug]: code } })),
      clear: (slug) =>
        set((s) => {
          const code = { ...s.code };
          delete code[slug];
          return { code };
        }),
    }),
    { name: "sds-dsa-drafts", version: 1 },
  ),
);
