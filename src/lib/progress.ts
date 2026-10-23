"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Progress = {
  done: Record<string, number>;
  quiz: Record<string, number>;
  bookmarks: string[];
  recent: string[];
  reduceMotion: boolean;
  /** Draw the site's diagrams like a marker sketch (a filter over the SVG diagrams). Off by default. */
  sketch: boolean;
  challenge: Record<string, number>;
  /** The learner's interview plan answers; the schedule itself is derived from progress (src/lib/prep/plan.ts). */
  plan: { rounds: ("dsa" | "hld" | "lld")[]; weeks: number; hoursPerWeek: number; startedAt: number } | null;
  /** Guided playground missions: how many steps have been passed, per challenge slug. */
  mission: Record<string, number>;
  /** "Explain it back" self-check per question slug: how much of the checklist the learner's answer covered, 0 to 1. */
  explain: Record<string, { score: number; at: number }>;
  /** Pattern-recognition drill: answers seen and answered right, per pattern slug. */
  drill: Record<string, { seen: number; right: number }>;
  /** "Got it" per lesson section, keyed `${pathname}#${sectionId}`. */
  sections: Record<string, number>;
  /** Lessons read as one long page, or one section card at a time. */
  /** "auto" (the default) reads one card at a time on a phone and as one page on a computer; a choice here overrides it. */
  readerMode: "auto" | "scroll" | "cards";
  /** Pages with folded sections: show only the core spine, or everything. */
  readerDepth: "core" | "all";
  toggleDone: (href: string) => void;
  markDone: (href: string) => void;
  saveQuiz: (href: string, score: number) => void;
  toggleBookmark: (href: string) => void;
  visit: (href: string) => void;
  setReduceMotion: (v: boolean) => void;
  setSketch: (v: boolean) => void;
  saveChallenge: (slug: string, percent: number) => void;
  recordDrill: (pattern: string, correct: boolean) => void;
  setMission: (slug: string, stepsPassed: number) => void;
  setPlan: (plan: Progress["plan"]) => void;
  saveExplain: (slug: string, score: number) => void;
  toggleSection: (key: string) => void;
  setReaderMode: (mode: "scroll" | "cards") => void;
  setReaderDepth: (depth: "core" | "all") => void;
};

export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      done: {},
      quiz: {},
      bookmarks: [],
      recent: [],
      reduceMotion: false,
      sketch: false,
      challenge: {},
      drill: {},
      mission: {},
      plan: null,
      explain: {},
      sections: {},
      readerMode: "auto",
      readerDepth: "core",
      toggleDone: (href) =>
        set((s) => {
          const done = { ...s.done };
          if (done[href]) delete done[href];
          else done[href] = Date.now();
          return { done };
        }),
      markDone: (href) => set((s) => (s.done[href] ? s : { done: { ...s.done, [href]: Date.now() } })),
      saveQuiz: (href, score) =>
        set((s) => ({
          quiz: { ...s.quiz, [href]: Math.max(score, s.quiz[href] ?? 0) },
          done: score >= 2 / 3 && !s.done[href] ? { ...s.done, [href]: Date.now() } : s.done,
        })),
      toggleBookmark: (href) =>
        set((s) => ({ bookmarks: s.bookmarks.includes(href) ? s.bookmarks.filter((b) => b !== href) : [...s.bookmarks, href] })),
      visit: (href) => set((s) => ({ recent: [href, ...s.recent.filter((r) => r !== href)].slice(0, 8) })),
      setReduceMotion: (v) => set({ reduceMotion: v }),
      setSketch: (v) => set({ sketch: v }),
      saveChallenge: (slug, percent) => set((s) => ({ challenge: { ...s.challenge, [slug]: Math.max(percent, s.challenge[slug] ?? 0) } })),
      setPlan: (plan) => set({ plan }),
      saveExplain: (slug, score) => set((s) => ({ explain: { ...s.explain, [slug]: { score, at: Date.now() } } })),
      setMission: (slug, stepsPassed) => set((s) => ({ mission: { ...s.mission, [slug]: stepsPassed } })),
      recordDrill: (pattern, correct) =>
        set((s) => {
          const prev = s.drill[pattern] ?? { seen: 0, right: 0 };
          return { drill: { ...s.drill, [pattern]: { seen: prev.seen + 1, right: prev.right + (correct ? 1 : 0) } } };
        }),
      toggleSection: (key) =>
        set((s) => {
          const sections = { ...s.sections };
          if (sections[key]) delete sections[key];
          else sections[key] = Date.now();
          return { sections };
        }),
      setReaderMode: (readerMode) => set({ readerMode }),
      setReaderDepth: (readerDepth) => set({ readerDepth }),
    }),
    {
      name: "sds-progress",
      version: 2,
      // Version 1 saved "scroll" as the default, not as a choice. Anyone who never switched modes gets "auto".
      migrate: (persisted, from) => (from < 2 ? { ...(persisted as object), readerMode: "auto" } : persisted) as never,
    },
  ),
);
