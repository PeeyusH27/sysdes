"use client";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** Media query match; false on the server and during hydration. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Calls `onWidth` with the content-box width of `ref`'s element each time it changes. Does nothing on the server, in
 * jsdom or without ResizeObserver. A width of 0 is skipped: an element hidden by the layout (an inactive pane) reports
 * 0, and keeping the last layout beats flashing the phone one.
 */
function useWidthObserver(ref: RefObject<Element | null>, onWidth: (width: number) => void) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) onWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, onWidth]);
}

/**
 * Content-box width of `ref`'s element in whole px (ResizeObserver). `undefined` on the server and until the first
 * measurement, so the first client render matches the server's (wide) one. Lets a diagram, chart or widget fit the box
 * it gets (a ~600 px pinned pane on desktop, a phone column) rather than the viewport.
 */
export function useBoxWidth(ref: RefObject<Element | null>): number | undefined {
  const [width, setWidth] = useState<number>();
  useWidthObserver(ref, useCallback((w: number) => setWidth(Math.round(w)), []));
  return width;
}

/**
 * True while `ref`'s element is narrower than `px` (its content box, compared unrounded). False on the server and until
 * measured, so the first client render matches the server's (wide) one. Re-renders only when the answer flips.
 */
export function useNarrow(ref: RefObject<Element | null>, px: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useWidthObserver(ref, useCallback((w: number) => setNarrow(w < px), [px]));
  return narrow;
}

/** True after the first client render: gate anything that reads localStorage. */
export function useHydrated() {
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReady(true), []);
  return ready;
}
