"use client";
import { useEffect, useState } from "react";

export interface Stepper {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  handleKey: (e: React.KeyboardEvent) => void;
}

/**
 * Drives step-through animations: Play/Pause/Next/Prev/Reset, a speed multiplier,
 * optional looping, and keyboard shortcuts (Space, ←, →, Home).
 */
export function useStepper(total: number, durationOf: (i: number) => number, opts: { loop?: boolean; autoplay?: boolean } = {}): Stepper {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(!!opts.autoplay);
  const [speed, setSpeed] = useState(1);
  const last = total - 1;

  useEffect(() => {
    if (!playing || total === 0) return;
    if (index >= last) {
      if (!opts.loop) return; // finished: `playing` below is derived as false
      const t = setTimeout(() => setIndex(-1), 1800 / speed);
      return () => clearTimeout(t);
    }
    const wait = index < 0 ? 200 : durationOf(index) / speed;
    const t = setTimeout(() => setIndex((i) => i + 1), wait);
    return () => clearTimeout(t);
  }, [playing, index, last, total, speed, durationOf, opts.loop]);

  const isPlaying = playing && total > 0 && (index < last || !!opts.loop);
  const api: Stepper = {
    index,
    total,
    playing: isPlaying,
    speed,
    setSpeed,
    play: () => {
      if (index >= last) setIndex(-1);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    next: () => {
      setPlaying(false);
      setIndex((i) => Math.min(i + 1, last));
    },
    prev: () => {
      setPlaying(false);
      setIndex((i) => Math.max(i - 1, 0));
    },
    reset: () => {
      setPlaying(false);
      setIndex(-1);
    },
    handleKey: (e) => {
      const keys: Record<string, () => void> = {
        " ": () => (isPlaying ? api.pause() : api.play()),
        ArrowRight: api.next,
        ArrowLeft: api.prev,
        Home: api.reset,
      };
      const fn = keys[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    },
  };
  return api;
}
