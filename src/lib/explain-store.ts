"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExplainStepId } from "@content/extras";

/** What the learner has written for each step of each question, kept apart from progress so typing never re-renders lists. */
type ExplainDrafts = {
  drafts: Record<string, Partial<Record<ExplainStepId, string>>>;
  ticks: Record<string, number[]>;
  write: (slug: string, step: ExplainStepId, text: string) => void;
  setTicks: (slug: string, ticks: number[]) => void;
  clear: (slug: string) => void;
};

export const useExplainDrafts = create<ExplainDrafts>()(
  persist(
    (set) => ({
      drafts: {},
      ticks: {},
      write: (slug, step, text) => set((s) => ({ drafts: { ...s.drafts, [slug]: { ...s.drafts[slug], [step]: text } } })),
      setTicks: (slug, ticks) => set((s) => ({ ticks: { ...s.ticks, [slug]: ticks } })),
      clear: (slug) =>
        set((s) => {
          const drafts = { ...s.drafts };
          const ticks = { ...s.ticks };
          delete drafts[slug];
          delete ticks[slug];
          return { drafts, ticks };
        }),
    }),
    { name: "sds-explain", version: 1 },
  ),
);
