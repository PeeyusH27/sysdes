"use client";
import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Content-box width of an element, tracked with ResizeObserver. `undefined` on the server and until the first
 * measurement, so the first client render matches the server's (desktop) render and hydration never mismatches.
 * Diagrams use it to fit their own box (a ~600 px pinned pane on desktop, a phone column) instead of the viewport.
 */
export function useBoxWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
