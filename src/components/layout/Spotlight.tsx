"use client";
import { useEffect } from "react";

/**
 * One delegated pointer listener for the whole site. Over a `.card-link` it sets --mx/--my (the spotlight in
 * globals.css); over a `.tilt` it also sets --rx/--ry so the card leans toward the pointer. Mouse only.
 */
export function Spotlight() {
  useEffect(() => {
    let raf = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      const e = last;
      if (!e || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(".card-link, .tilt, .spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      if (el.classList.contains("tilt")) {
        el.style.setProperty("--ry", `${((x / r.width - 0.5) * 7).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y / r.height) * 7).toFixed(2)}deg`);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
