"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ShortsState = {
  /** Shorts that stayed on screen for a moment. */
  seen: Record<string, number>;
  /** Shorts the reader ticked as understood. */
  got: Record<string, number>;
  saved: string[];
  /** The swipe hint has been shown and dismissed. */
  hintDone: boolean;
  markSeen: (id: string) => void;
  toggleGot: (id: string) => void;
  toggleSaved: (id: string) => void;
  dismissHint: () => void;
};

const toggleKey = (map: Record<string, number>, id: string) => {
  const next = { ...map };
  if (next[id]) delete next[id];
  else next[id] = Date.now();
  return next;
};

export const useShorts = create<ShortsState>()(
  persist(
    (set) => ({
      seen: {},
      got: {},
      saved: [],
      hintDone: false,
      markSeen: (id) => set((s) => (s.seen[id] ? s : { seen: { ...s.seen, [id]: Date.now() } })),
      toggleGot: (id) => set((s) => ({ got: toggleKey(s.got, id) })),
      toggleSaved: (id) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id] })),
      dismissHint: () => set({ hintDone: true }),
    }),
    { name: "sds-shorts", version: 1 },
  ),
);
