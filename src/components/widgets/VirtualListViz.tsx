"use client";
import { useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Layers } from "lucide-react";
import { int } from "@/lib/format";
import { WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure windowing */

export const ROW_H = 44;
export const VIEWPORT_H = 264;
export const OVERSCAN = 3;
/** Without virtualization we stop here, so the demo can't freeze the page. */
export const NON_VIRTUAL_CAP = 2_000;

/** Rows [start, end) to mount for a fixed-height list scrolled to `scrollTop`, plus `overscan` rows each side. */
export function windowRange(scrollTop: number, viewportH: number, rowH: number, total: number, overscan = OVERSCAN) {
  if (total <= 0) return { start: 0, end: 0 };
  const first = Math.floor(Math.max(0, scrollTop) / rowH);
  const last = Math.ceil((Math.max(0, scrollTop) + viewportH) / rowH);
  return { start: Math.max(0, first - overscan), end: Math.min(total, last + overscan) };
}

/** Rows actually in the DOM in each mode. */
export function mountedRows(virtual: boolean, total: number, range: { start: number; end: number }, cap = NON_VIRTUAL_CAP) {
  return virtual ? range.end - range.start : Math.min(total, cap);
}

/** The most rows a virtual window ever mounts (stable number for the live readout). */
export const maxWindow = (viewportH: number, rowH: number, total: number, overscan = OVERSCAN) =>
  Math.min(total, Math.ceil(viewportH / rowH) + 1 + 2 * overscan);

/* ------------------------------------------------------------------ fake feed rows */

const WHO = ["Ada", "Linus", "Grace", "Ken", "Barbara", "Edsger", "Margaret", "Tim", "Radia", "Dennis"];
const WHAT = ["shipped a cache layer", "wrote about sharding", "fixed a race condition", "posted a load test", "drew an architecture", "asked about queues", "benchmarked Redis", "tuned a connection pool"];
const AVATAR = ["var(--k-client)", "var(--k-service)", "var(--k-database)", "var(--k-gateway)", "var(--k-cache)", "var(--k-queue)"];

function Row({ i, total, style }: { i: number; total: number; style?: React.CSSProperties }) {
  return (
    <div role="listitem" aria-setsize={total} aria-posinset={i + 1} className="vl-row" style={style}>
      <span className="vl-avatar" style={{ background: AVATAR[i % AVATAR.length] }} aria-hidden />
      <span className="vl-text">
        <strong>{WHO[i % WHO.length]}</strong> {WHAT[(i * 7) % WHAT.length]}
      </span>
      <span className="vl-idx">#{int(i + 1)}</span>
    </div>
  );
}

const CSS = `
.vl-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 8px; }
.vl-jumps { display: flex; gap: 6px; }
.vl-wrap { position: relative; }
.vl-scroll { height: ${VIEWPORT_H}px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--card-2); overscroll-behavior: contain; }
.vl-row { height: ${ROW_H}px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-bottom: 1px solid var(--border); font-size: 13.5px; box-sizing: border-box; background: var(--card); }
.vl-avatar { flex: none; width: 24px; height: 24px; border-radius: 50%; opacity: .85; }
.vl-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vl-idx { flex: none; font: 12px var(--font-mono); color: var(--muted); }
.vl-badge { position: absolute; top: 8px; right: 22px; z-index: 2; pointer-events: none; background: var(--card); border: 1px solid var(--border-strong); border-radius: 999px; padding: 3px 10px; font-size: 12.5px; box-shadow: var(--shadow); font-variant-numeric: tabular-nums; }
.vl-more { padding: 14px 12px; font-size: 13px; color: var(--muted); text-align: center; }
.vl-note { font-size: 13px; margin: 6px 0 0 !important; }
`;

export function VirtualListViz() {
  const [total, setTotal] = useState(10_000);
  const [virtual, setVirtual] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const range = windowRange(scrollTop, VIEWPORT_H, ROW_H, total);
  const mounted = mountedRows(virtual, total, range);
  const capped = !virtual && total > NON_VIRTUAL_CAP;
  const firstVisible = Math.min(total, Math.floor(scrollTop / ROW_H) + 1);
  const lastVisible = Math.min(virtual ? total : Math.min(total, NON_VIRTUAL_CAP), Math.ceil((scrollTop + VIEWPORT_H) / ROW_H));
  const pct = (n: number) => `${((n / total) * 100).toFixed(n / total < 0.01 ? 2 : 1)}%`;
  const stable = virtual ? maxWindow(VIEWPORT_H, ROW_H, total) : Math.min(total, NON_VIRTUAL_CAP);

  const jump = (to: "top" | "middle" | "bottom") => {
    const el = box.current;
    if (!el) return;
    el.scrollTop = to === "top" ? 0 : to === "middle" ? (el.scrollHeight - el.clientHeight) / 2 : el.scrollHeight;
  };

  return (
    <WidgetFrame title="Virtualized list" sub="Scroll a feed of thousands of rows. With windowing only the rows in view (plus a few spare) exist in the DOM; the rest is an empty spacer.">
      <style href="w-virtual-list" precedence="widgets">
        {CSS}
      </style>
      <div className="vl-bar">
        <div className="seg" role="group" aria-label="Items in the feed">
          {[1_000, 10_000, 100_000].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={total === v}
              title={`${int(v)} items`}
              onClick={() => {
                setTotal(v);
                setScrollTop(0);
                if (box.current) box.current.scrollTop = 0;
              }}
            >
              {v >= 1_000 ? `${v / 1_000}k` : v}
            </button>
          ))}
        </div>
        <button type="button" className="wbtn primary" aria-pressed={virtual} onClick={() => setVirtual((v) => !v)}>
          <Layers size={14} aria-hidden /> Virtualization: {virtual ? "on" : "off"}
        </button>
        <div className="vl-jumps">
          <button type="button" className="wbtn" onClick={() => jump("top")}>
            <ArrowUpToLine size={14} aria-hidden /> Top
          </button>
          <button type="button" className="wbtn" onClick={() => jump("middle")}>
            Middle
          </button>
          <button type="button" className="wbtn" onClick={() => jump("bottom")}>
            <ArrowDownToLine size={14} aria-hidden /> End
          </button>
        </div>
      </div>

      <div className="vl-wrap">
        <div className="vl-badge" aria-hidden>
          mounted DOM rows: <strong className={virtual ? "ok-ink" : "bad-ink"}>{int(mounted)}</strong> / {int(total)}
        </div>
        <div
          ref={box}
          className="vl-scroll"
          tabIndex={0}
          role="region"
          aria-label={`Feed with ${int(total)} rows. Use the arrow keys or Page Down to scroll.`}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          {virtual ? (
            // One tall spacer keeps the scrollbar honest; only the window of rows is absolutely positioned inside it.
            <div role="list" aria-label="Posts" style={{ height: total * ROW_H, position: "relative" }}>
              {Array.from({ length: range.end - range.start }, (_, k) => {
                const i = range.start + k;
                return <Row key={i} i={i} total={total} style={{ position: "absolute", top: i * ROW_H, left: 0, right: 0 }} />;
              })}
            </div>
          ) : (
            <div role="list" aria-label="Posts">
              {Array.from({ length: Math.min(total, NON_VIRTUAL_CAP) }, (_, i) => (
                <Row key={i} i={i} total={total} />
              ))}
              {capped && (
                <div className="vl-more">
                  {int(total - NON_VIRTUAL_CAP)} more rows not rendered: this demo stops at {int(NON_VIRTUAL_CAP)} so your browser stays responsive. A real non-virtualized list would mount all {int(total)}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="muted vl-note">
        In view: rows {int(firstVisible)}–{int(lastVisible)}
        {virtual && (
          <>
            {" "}
            · mounted window: rows {int(range.start + 1)}–{int(range.end)} ({OVERSCAN} spare above and below) · spacer height {int(total * ROW_H)} px
          </>
        )}
      </p>
      <p className="readout" aria-live="polite">
        {virtual ? (
          <>
            Virtualization on: about <strong className="ok-ink">{int(stable)}</strong> of {int(total)} rows are in the DOM ({pct(stable)}). Scrolling only swaps which rows are mounted, so the cost stays flat at any list length.
          </>
        ) : (
          <>
            Virtualization off: <strong className="bad-ink">{int(stable)}</strong> rows are mounted ({pct(stable)}
            {capped ? `, capped from ${int(total)}` : ""}), roughly {int(stable * 5)} DOM nodes to lay out, style and keep in memory.
          </>
        )}
      </p>
    </WidgetFrame>
  );
}
