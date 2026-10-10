"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Progress = {
  done: Record<string, number>;
  quiz: Record<string, number>;
  bookmarks: string[];
  recent: string[];
  reduceMotion: boolean;
  challenge: Record<string, number>;
  toggleDone: (href: string) => void;
  markDone: (href: string) => void;
  saveQuiz: (href: string, score: number) => void;
  toggleBookmark: (href: string) => void;
  visit: (href: string) => void;
  setReduceMotion: (v: boolean) => void;
  saveChallenge: (slug: string, percent: number) => void;
};

export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      done: {},
      quiz: {},
      bookmarks: [],
      recent: [],
      reduceMotion: false,
      challenge: {},
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
      saveChallenge: (slug, percent) => set((s) => ({ challenge: { ...s.challenge, [slug]: Math.max(percent, s.challenge[slug] ?? 0) } })),
    }),
    { name: "sds-progress", version: 1 },
  ),
);
