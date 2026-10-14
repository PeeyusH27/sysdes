"use client";
import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { CircleCheck, Pause, Play, RotateCcw, SkipBack, SkipForward, TriangleAlert } from "lucide-react";
import { useSimGate } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure stories */

export type PatternId = "cache-aside" | "read-through" | "write-through" | "write-behind" | "write-around" | "refresh-ahead";
export type Lane = "app" | "cache" | "db";
export type Phase = "write" | "read 1" | "read 2" | "later";

export interface PStep {
  from: Lane;
  to: Lane;
  label: string;
  phase: Phase;
  reply?: boolean;
  /** cache value after this step (null = no entry); omitted = unchanged */
  cache?: number | null;
  /** db value after this step; omitted = unchanged */
  db?: number;
  /** after this step, could some reader still see the old price? */
  stale: boolean;
  /** after this step, would a cache crash lose the new price? */
  risk?: boolean;
  /** what the app got back, for read replies */
  got?: number;
}

export interface Story {
  name: string;
  initial: { cache: number | null; db: number };
  steps: PStep[];
  staleness: string;
  crash: string;
  loses: boolean;
  firstReadMisses: boolean;
}

const OLD = 10;
const NEW = 12;

export const STORIES: Record<PatternId, Story> = {
  "cache-aside": {
    name: "Cache-aside",
    initial: { cache: OLD, db: OLD },
    steps: [
      { from: "app", to: "db", label: "UPDATE price = 12", phase: "write", db: NEW, stale: true },
      { from: "db", to: "app", label: "OK", phase: "write", reply: true, stale: true },
      { from: "app", to: "cache", label: "DEL price", phase: "write", cache: null, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 1", stale: false },
      { from: "cache", to: "app", label: "nil (miss)", phase: "read 1", reply: true, stale: false },
      { from: "app", to: "db", label: "SELECT price", phase: "read 1", stale: false },
      { from: "db", to: "app", label: "12", phase: "read 1", reply: true, stale: false, got: NEW },
      { from: "app", to: "cache", label: "SET price 12 EX 300", phase: "read 1", cache: NEW, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 2", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: false, got: NEW },
    ],
    staleness: "Only between the UPDATE and the DEL (about a millisecond). If the DEL fails, until the TTL expires.",
    crash: "Nothing is lost: the database already has 12. Reads just miss and reload.",
    loses: false,
    firstReadMisses: true,
  },
  "read-through": {
    name: "Read-through",
    initial: { cache: OLD, db: OLD },
    steps: [
      { from: "app", to: "db", label: "UPDATE price = 12", phase: "write", db: NEW, stale: true },
      { from: "db", to: "app", label: "OK", phase: "write", reply: true, stale: true },
      { from: "app", to: "cache", label: "invalidate(price)", phase: "write", cache: null, stale: false },
      { from: "app", to: "cache", label: "get(price)", phase: "read 1", stale: false },
      { from: "cache", to: "db", label: "loader: SELECT", phase: "read 1", stale: false },
      { from: "db", to: "cache", label: "12", phase: "read 1", reply: true, cache: NEW, stale: false },
      { from: "cache", to: "app", label: "12 (loaded)", phase: "read 1", reply: true, stale: false, got: NEW },
      { from: "app", to: "cache", label: "get(price)", phase: "read 2", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: false, got: NEW },
    ],
    staleness: "Same as cache-aside: between the write and the invalidation, or until the TTL.",
    crash: "No data is lost (the database has 12), but the app only talks to the cache: whether reads survive depends on the library falling back to the database.",
    loses: false,
    firstReadMisses: true,
  },
  "write-through": {
    name: "Write-through",
    initial: { cache: OLD, db: OLD },
    steps: [
      { from: "app", to: "cache", label: "SET price 12", phase: "write", cache: NEW, stale: false },
      { from: "cache", to: "db", label: "UPDATE price = 12", phase: "write", db: NEW, stale: false },
      { from: "db", to: "cache", label: "OK", phase: "write", reply: true, stale: false },
      { from: "cache", to: "app", label: "OK (both written)", phase: "write", reply: true, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 1", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 1", reply: true, stale: false, got: NEW },
      { from: "app", to: "cache", label: "GET price", phase: "read 2", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: false, got: NEW },
    ],
    staleness: "None for readers: the write is acknowledged only after both the cache and the database have 12. The price is a slower write.",
    crash: "Nothing is lost: the database was written before the app got its OK.",
    loses: false,
    firstReadMisses: false,
  },
  "write-behind": {
    name: "Write-behind",
    initial: { cache: OLD, db: OLD },
    steps: [
      { from: "app", to: "cache", label: "SET price 12", phase: "write", cache: NEW, stale: true, risk: true },
      { from: "cache", to: "app", label: "OK (DB not written yet)", phase: "write", reply: true, stale: true, risk: true },
      { from: "app", to: "cache", label: "GET price", phase: "read 1", stale: true, risk: true },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 1", reply: true, stale: true, risk: true, got: NEW },
      { from: "app", to: "cache", label: "GET price", phase: "read 2", stale: true, risk: true },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: true, risk: true, got: NEW },
      { from: "cache", to: "db", label: "flush batch: UPDATE", phase: "later", db: NEW, stale: false, risk: false },
      { from: "db", to: "cache", label: "OK", phase: "later", reply: true, stale: false },
    ],
    staleness: "Cache readers see 12 at once, but the database (and anything reading it directly: reports, other services) has 10 until the next flush, seconds later.",
    crash: "Data loss: if the cache crashes before the flush, price = 12 is gone for good.",
    loses: true,
    firstReadMisses: false,
  },
  "write-around": {
    name: "Write-around",
    initial: { cache: null, db: OLD },
    steps: [
      { from: "app", to: "db", label: "UPDATE price = 12", phase: "write", db: NEW, stale: false },
      { from: "db", to: "app", label: "OK (cache untouched)", phase: "write", reply: true, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 1", stale: false },
      { from: "cache", to: "app", label: "nil (miss)", phase: "read 1", reply: true, stale: false },
      { from: "app", to: "db", label: "SELECT price", phase: "read 1", stale: false },
      { from: "db", to: "app", label: "12", phase: "read 1", reply: true, stale: false, got: NEW },
      { from: "app", to: "cache", label: "SET price 12 EX 300", phase: "read 1", cache: NEW, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 2", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: false, got: NEW },
    ],
    staleness: "None here: writes skip the cache and the key wasn't cached. If it had been, you'd also delete it (or wait for the TTL).",
    crash: "Nothing is lost: writes only ever go to the database.",
    loses: false,
    firstReadMisses: true,
  },
  "refresh-ahead": {
    name: "Refresh-ahead",
    initial: { cache: OLD, db: OLD },
    steps: [
      { from: "app", to: "db", label: "UPDATE price = 12", phase: "write", db: NEW, stale: true },
      { from: "db", to: "app", label: "OK", phase: "write", reply: true, stale: true },
      { from: "app", to: "cache", label: "GET price", phase: "read 1", stale: true },
      { from: "cache", to: "app", label: "10 (hit, old!)", phase: "read 1", reply: true, stale: true, got: OLD },
      { from: "cache", to: "db", label: "TTL 80% used: refresh", phase: "read 1", stale: true },
      { from: "db", to: "cache", label: "12", phase: "read 1", reply: true, cache: NEW, stale: false },
      { from: "app", to: "cache", label: "GET price", phase: "read 2", stale: false },
      { from: "cache", to: "app", label: "12 (hit)", phase: "read 2", reply: true, stale: false, got: NEW },
    ],
    staleness: "Bounded by the refresh interval: read 1 still got 10, and the background refresh fixed it for read 2. Hot keys never expire, so they never miss.",
    crash: "Nothing is lost: the database has 12.",
    loses: false,
    firstReadMisses: false,
  },
};

export const PATTERN_IDS = Object.keys(STORIES) as PatternId[];

/** Cache/DB values, staleness and crash risk after step `idx` (-1 = before the story starts). */
export function stateAt(story: Story, idx: number) {
  let cache = story.initial.cache;
  let db = story.initial.db;
  let stale = false;
  let risk = false;
  for (let i = 0; i <= Math.min(idx, story.steps.length - 1); i++) {
    const s = story.steps[i];
    if (s.cache !== undefined) cache = s.cache;
    if (s.db !== undefined) db = s.db;
    stale = s.stale;
    risk = s.risk ?? false;
  }
  return { cache, db, stale, risk };
}

/** Values each read returned, in order. */
export const readsGot = (story: Story) => story.steps.filter((s) => s.got !== undefined).map((s) => s.got!);

/* ------------------------------------------------------------------ view */

const LANE_NAME: Record<Lane, string> = { app: "App", cache: "Cache", db: "DB" };
const LANE_COLOR: Record<Lane, string> = { app: "var(--k-service)", cache: "var(--k-cache)", db: "var(--k-database)" };
const HEAD = 56;
const ROW = 23;

/**
 * Width of the picture's box, so the sequence diagram can be drawn at 1:1 (text stays 11 px) whatever the pane width.
 * Phones get a 330-unit drawing scaled down a little. Until measured (and on the server) it assumes a desktop pane.
 */
function useBoxWidth(ref: React.RefObject<HTMLElement | null>, fallback = 470) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

const CSS = `
.w-pc { container-type: inline-size; }
.w-pc .pc-steps { justify-content: flex-start; margin: 0 0 6px; flex-wrap: wrap; }
.w-pc .pc-main { display: grid; grid-template-columns: 138px minmax(0, 1fr); gap: 10px; align-items: start; }
.w-pc .pc-rail { display: flex; flex-direction: column; align-items: stretch; }
.w-pc .pc-rail button { text-align: left; }
.w-pc .pc-notes { display: grid; gap: 4px; margin-top: 6px; font-size: 13px; line-height: 1.45; }
.w-pc .pc-notes p { margin: 0; display: flex; gap: 8px; align-items: baseline; }
@container (max-width: 519px) {
  .w-pc .pc-main { display: block; }
  .w-pc .pc-rail { flex-direction: row; flex-wrap: wrap; margin-bottom: 6px; }
  .w-pc .pc-notes p { display: block; }
  .w-pc .pc-notes .pill { margin-right: 6px; }
}
`;

export function PatternComparator() {
  const [id, setId] = useState<PatternId>("cache-aside");
  const story = STORIES[id];
  const n = story.steps.length;
  const [idx, setIdx] = useState(n - 1); // first frame (and no-JS): the whole story
  const [playing, setPlaying] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const started = useRef(false);
  const boxW = useBoxWidth(ref);

  // Autoplay once, when first scrolled into view.
  useEffect(() => {
    if (!inView || reduce || started.current) return;
    started.current = true;
    const t = setTimeout(() => {
      setIdx(-1);
      setPlaying(true);
    }, 150);
    return () => clearTimeout(t);
  }, [inView, reduce]);

  useEffect(() => {
    if (!playing || !inView || reduce) return;
    if (idx >= n - 1) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), idx < 0 ? 300 : 950);
    return () => clearTimeout(t);
  }, [playing, idx, n, inView, reduce]);

  const choose = (p: PatternId) => {
    setId(p);
    if (reduce) {
      setIdx(STORIES[p].steps.length - 1);
      setPlaying(false);
    } else {
      setIdx(-1);
      setPlaying(true);
    }
  };

  const st = stateAt(story, idx);
  const cur = idx >= 0 ? story.steps[idx] : null;
  const H = HEAD + n * ROW + 10;
  const done = idx >= n - 1;
  const got = readsGot(story);
  const lastGot = story.steps.slice(0, idx + 1).filter((x) => x.got !== undefined).at(-1)?.got;

  // Geometry: drawn at the box's own width (1:1) between 330 and 700 units.
  const W = Math.max(330, Math.min(700, boxW));
  const narrow = W < 420;
  const boxWd = narrow ? 76 : 104;
  const left = narrow ? 44 : 74;
  const LANE_X: Record<Lane, number> = { app: left + boxWd / 2, cache: (left + boxWd / 2 + W - 4 - boxWd / 2) / 2 + (narrow ? 4 : 8), db: W - 4 - boxWd / 2 };

  // vertical staleness band: contiguous runs of stale rows (up to the current step)
  const runs: [number, number][] = [];
  story.steps.forEach((s, i) => {
    if (i > idx || !s.stale) return;
    const last = runs.at(-1);
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  });

  const valueText = (v: number | null) => (v === null ? "(no entry)" : `price = ${v}`);
  const boxText = (l: Lane) => {
    const v = l === "cache" ? st.cache : l === "db" ? st.db : null;
    if (l === "app") return lastGot === undefined ? "–" : narrow ? `read ${lastGot}` : `last read: ${lastGot}`;
    if (v === null) return narrow ? "(none)" : "(no entry)";
    return narrow ? `${v}${v === OLD ? " (old)" : ""}` : `price = ${v}${v === OLD ? " (old)" : ""}`;
  };

  return (
    <WidgetFrame title="Caching patterns side by side" sub="Same story in every tab: write price = 12 (it was 10), then read it twice.">
      <style href="w-pattern-comparator" precedence="widgets">
        {CSS}
      </style>
      <div className="w-pc">
        <div className="step-buttons pc-steps">
          <button type="button" onClick={() => { setPlaying(false); setIdx(-1); }} aria-label="Restart" title="Restart">
            <RotateCcw size={15} aria-hidden />
          </button>
          <button type="button" onClick={() => { setPlaying(false); setIdx((i) => Math.max(-1, i - 1)); }} aria-label="Previous step" disabled={idx < 0}>
            <SkipBack size={15} aria-hidden />
          </button>
          {!reduce && (
            <button
              type="button"
              className="play"
              onClick={() => {
                if (playing) setPlaying(false);
                else {
                  if (done) setIdx(-1);
                  setPlaying(true);
                }
              }}
            >
              {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />} {playing ? "Pause" : done ? "Replay" : "Play"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setIdx((i) => (i >= n - 1 ? -1 : i + 1));
            }}
            aria-label={done ? "Start over" : "Next step"}
            title="Step"
          >
            <SkipForward size={15} aria-hidden /> {reduce ? (done ? "Start over" : "Step") : ""}
          </button>
          <span className="step-count" aria-hidden>
            {Math.max(0, idx + 1)} / {n}
          </span>
        </div>

        <div className="pc-main">
          <div className="seg pc-rail" role="group" aria-label="Pattern">
            {PATTERN_IDS.map((p) => (
              <button key={p} type="button" aria-pressed={p === id} onClick={() => choose(p)}>
                {STORIES[p].name}
              </button>
            ))}
          </div>

          <div ref={ref}>
            <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={`${story.name}: step ${Math.max(0, idx + 1)} of ${n}. Cache ${valueText(st.cache)}, DB ${valueText(st.db)}.`}>
              <defs>
                <marker id="pc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
                </marker>
                <marker id="pc-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="var(--accent)" />
                </marker>
              </defs>
              {/* lanes */}
              {(Object.keys(LANE_X) as Lane[]).map((l) => {
                const v = l === "cache" ? st.cache : l === "db" ? st.db : null;
                const changed = cur && ((l === "cache" && cur.cache !== undefined) || (l === "db" && cur.db !== undefined));
                return (
                  <g key={l}>
                    <rect x={LANE_X[l] - boxWd / 2} y={4} width={boxWd} height={40} rx={9} fill="var(--card-2)" stroke={LANE_COLOR[l]} strokeWidth={changed ? 2.8 : 1.6} />
                    <text x={LANE_X[l]} y={20} textAnchor="middle" style={{ fontWeight: 700 }}>
                      {LANE_NAME[l]}
                    </text>
                    <text x={LANE_X[l]} y={36} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: v === OLD && l !== "app" ? "var(--warning-ink)" : v === null ? "var(--muted)" : "var(--fg)" }}>
                      {boxText(l)}
                    </text>
                    <line x1={LANE_X[l]} x2={LANE_X[l]} y1={44} y2={H - 4} stroke="var(--border-strong)" strokeDasharray="3 4" />
                  </g>
                );
              })}
              {/* staleness band */}
              <text x={4} y={HEAD - 4} className="muted-text" style={{ fontSize: 10.5 }}>
                stale?
              </text>
              <rect x={6} y={HEAD} width={7} height={n * ROW} rx={3.5} fill="var(--border)" />
              {runs.map(([a, b]) => (
                <rect key={a} x={6} y={HEAD + a * ROW + 2} width={7} height={(b - a + 1) * ROW - 4} rx={3.5} fill="var(--warning)" />
              ))}
              {/* steps */}
              {story.steps.map((s, i) => {
                if (i > idx) return null;
                const y = HEAD + i * ROW + ROW / 2 + 4;
                const x1 = LANE_X[s.from];
                const x2 = LANE_X[s.to];
                const dir = Math.sign(x2 - x1);
                const hot = i === idx;
                const newPhase = i === 0 || story.steps[i - 1].phase !== s.phase;
                return (
                  <g key={`${id}-${i}`}>
                    {newPhase && (
                      <text x={18} y={y + 4} style={{ fontSize: narrow ? 9.5 : 10.5, fontWeight: 700, fill: "var(--muted)" }}>
                        {s.phase}
                      </text>
                    )}
                    {s.stale && hot && !newPhase && (
                      <text x={18} y={y + 4} style={{ fontSize: 9.5, fontWeight: 700, fill: "var(--warning-ink)" }}>
                        stale
                      </text>
                    )}
                    <m.line
                      x1={x1 + dir * 4}
                      y1={y}
                      y2={y}
                      stroke={hot ? "var(--accent)" : "var(--muted)"}
                      strokeWidth={hot ? 2.2 : 1.4}
                      strokeDasharray={s.reply ? "5 4" : undefined}
                      markerEnd={`url(#${hot ? "pc-arrow-hot" : "pc-arrow"})`}
                      initial={reduce || !hot ? { x2: x2 - dir * 6 } : { x2: x1 + dir * 6 }}
                      animate={{ x2: x2 - dir * 6 }}
                      transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={y - 5}
                      textAnchor="middle"
                      style={{ fontSize: 11, fontWeight: hot ? 700 : 500, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 4, strokeLinejoin: "round" }}
                    >
                      {s.label}
                    </text>
                    {s.got !== undefined && (
                      <text x={LANE_X.app - 6} y={y + 4} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 700, fill: s.got === OLD ? "var(--warning-ink)" : "var(--good-ink)" }}>
                        got {s.got}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="pc-notes">
          <p>
            <span className="pill warn-ink" style={{ flex: "none" }}>
              Staleness window
            </span>
            <span>{story.staleness}</span>
          </p>
          <p>
            <span className={`pill ${story.loses ? "bad-ink" : "ok-ink"}`} style={{ flex: "none" }}>
              {story.loses ? <TriangleAlert size={12} aria-hidden /> : <CircleCheck size={12} aria-hidden />} Cache crash: {story.loses ? "loses data" : "no data lost"}
            </span>
            <span>{story.crash}</span>
          </p>
        </div>
        <p className="readout" aria-live="polite">
          {cur ? (
            <>
              <strong>
                Step {idx + 1} of {n}
              </strong>{" "}
              ({cur.phase}): {LANE_NAME[cur.from]} → {LANE_NAME[cur.to]}: {cur.label}. Cache {valueText(st.cache)}, DB {valueText(st.db)}.{" "}
              {st.stale ? <span className="warn-ink">A reader could still see the old price.</span> : <span className="ok-ink">Every reader sees 12.</span>}
              {st.risk && <span className="bad-ink"> A cache crash now would lose the write.</span>}
            </>
          ) : (
            <>
              {story.name}: price is 10 in the database and {story.initial.cache === null ? "not cached" : "10 in the cache"}. Press Play or Step to write 12 and read it twice (the reads will return {got.join(" and ")}
              {story.firstReadMisses ? ", and the first one misses" : ""}).
            </>
          )}
        </p>
      </div>
    </WidgetFrame>
  );
}
