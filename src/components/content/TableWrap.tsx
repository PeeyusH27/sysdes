"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Wrapper for MDX tables. In the half-width reading column a wide table can scroll sideways; only then does the
 * wrapper become a focusable, labelled region, so keyboard users can scroll it (and axe's scrollable-region rule passes)
 * without adding a tab stop to every table.
 */
export function TableWrap(props: React.ComponentProps<"table">) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="table-wrap" tabIndex={scrolls ? 0 : undefined} role={scrolls ? "region" : undefined} aria-label={scrolls ? "Table, scrolls sideways" : undefined}>
      <table {...props} />
    </div>
  );
}
