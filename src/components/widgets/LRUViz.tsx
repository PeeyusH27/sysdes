"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Dices, RotateCcw } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useSimGate } from "./lib/sim-kit";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

/**
 * Least-recently-used cache on a Map: a Map iterates in insertion order, so the first key is the
 * least recent. A hit deletes and re-inserts the key to make it the most recent.
 */
export class LRUCache<K, V> {
  private map: Map<K, V>;
  readonly evictedOnCreate: K[] = [];
  constructor(
    readonly capacity: number,
    entries: Iterable<[K, V]> = [],
  ) {
    this.map = new Map(entries);
    while (this.map.size > capacity) this.evictedOnCreate.push(this.evictOldest()!);
  }
  get size() {
    return this.map.size;
  }
  has(key: K) {
    return this.map.has(key);
  }
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  /** Insert or update; returns the evicted key, if any. */
  set(key: K, value: V): K | undefined {
    this.map.delete(key);
    this.map.set(key, value);
    return this.map.size > this.capacity ? this.evictOldest() : undefined;
  }
  private evictOldest() {
    const oldest = this.map.keys().next();
    if (oldest.done) return undefined;
    this.map.delete(oldest.value);
    return oldest.value;
  }
  /** Most recent first. */
  keysByRecency(): K[] {
    return [...this.map.keys()].reverse();
  }
  entries(): [K, V][] {
    return [...this.map.entries()];
  }
}

export type LruOp = "get" | "set";
export interface AccessResult {
  entries: [string, number][];
  hit: boolean;
  evicted: string | null;
  value: number;
}

/**
 * One access on an immutable snapshot. `get` is read-through: a miss loads the value (v1, or its
 * last written version) and inserts it. `set` writes a new version and makes the key most recent.
 */
export function lruAccess(entries: [string, number][], capacity: number, op: LruOp, key: string, versions: Record<string, number> = {}): AccessResult {
  const cache = new LRUCache(capacity, entries);
  if (op === "get") {
    const v = cache.get(key);
    if (v !== undefined) return { entries: cache.entries(), hit: true, evicted: null, value: v };
    const loaded = versions[key] ?? 1;
    const evicted = cache.set(key, loaded) ?? null;
    return { entries: cache.entries(), hit: false, evicted, value: loaded };
  }
  const hit = cache.has(key);
  const value = (versions[key] ?? 1) + 1;
  const evicted = cache.set(key, value) ?? null;
  return { entries: cache.entries(), hit, evicted, value };
}

export const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];
/** Skewed popularity (Zipf-like, weight 1/rank) so a small cache still earns hits. */
export function pickKey(rand: () => number) {
  const weights = KEYS.map((_, i) => 1 / (i + 1));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < KEYS.length; i++) {
    r -= weights[i];
    if (r <= 0) return KEYS[i];
  }
  return KEYS[KEYS.length - 1];
}

// ---------------------------------------------------------------- picture
const W = 540;
const PAD = 14;
const GAP = 8;
const BOX = (W - PAD * 2 - GAP * 7) / 8;
const Y = 44;
const slotX = (i: number) => PAD + i * (BOX + GAP);

interface Last {
  op: LruOp;
  key: string;
  hit: boolean;
  evicted: string | null;
  evictedFrom: number;
  value: number;
  seq: number;
}

export function LRUViz() {
  const [capacity, setCapacity] = useState(4);
  const [op, setOp] = useState<LruOp>("get");
  const [entries, setEntries] = useState<[string, number][]>([]);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ hits: 0, misses: 0, writes: 0, evictions: 0 });
  const [last, setLast] = useState<Last | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const rand = useMemo(() => mulberry32(99), []);
  const { ref, reduce } = useSimGate<HTMLDivElement>();

  const apply = (ops: { op: LruOp; key: string }[]) => {
    let e = entries;
    let ver = versions;
    let st = stats;
    let lastRes: Last | null = last;
    for (const o of ops) {
      const before = e.length;
      const r = lruAccess(e, capacity, o.op, o.key, ver);
      if (o.op === "set") ver = { ...ver, [o.key]: r.value };
      st = {
        hits: st.hits + (o.op === "get" && r.hit ? 1 : 0),
        misses: st.misses + (o.op === "get" && !r.hit ? 1 : 0),
        writes: st.writes + (o.op === "set" ? 1 : 0),
        evictions: st.evictions + (r.evicted ? 1 : 0),
      };
      lastRes = { ...o, hit: r.hit, evicted: r.evicted, evictedFrom: Math.min(before, capacity) - 1, value: r.value, seq: (lastRes?.seq ?? 0) + 1 };
      e = r.entries;
    }
    setEntries(e);
    setVersions(ver);
    setStats(st);
    setLast(lastRes);
    setNote(null);
  };
  const changeCapacity = (c: number) => {
    const cache = new LRUCache(c, entries);
    setCapacity(c);
    setEntries(cache.entries());
    if (cache.evictedOnCreate.length) {
      setStats((s) => ({ ...s, evictions: s.evictions + cache.evictedOnCreate.length }));
      setNote(`Capacity cut to ${c}: evicted ${cache.evictedOnCreate.join(", ")} (least recently used first).`);
    }
  };
  const resetAll = () => {
    setEntries([]);
    setVersions({});
    setStats({ hits: 0, misses: 0, writes: 0, evictions: 0 });
    setLast(null);
    setNote(null);
  };

  const order = [...entries].reverse(); // most recent first
  const gets = stats.hits + stats.misses;
  const ratio = gets ? Math.round((stats.hits / gets) * 100) : 0;

  let sentence = "Empty cache. Press a key to get it (a miss loads it), or switch to set.";
  if (last) {
    const what =
      last.op === "get"
        ? last.hit
          ? `get(${last.key}): hit. ${last.key} moves to the most-recent end.`
          : `get(${last.key}): miss. Loaded ${last.key} from the database and inserted it as most recent.`
        : `set(${last.key}, v${last.value}): ${last.hit ? "updated in place and" : "inserted,"} moved to the most-recent end.`;
    sentence = `${what}${last.evicted ? ` Cache was full, so ${last.evicted} (least recently used) was evicted.` : ""}`;
  }
  if (note) sentence = note;

  return (
    <WidgetFrame title="LRU cache" sub="Every access moves a key to the front. When the cache is full, the key at the back (least recently used) is evicted.">
      <div className="controls">
        <Slider label="Capacity" value={capacity} min={2} max={8} onChange={changeCapacity} format={(v) => `${v} keys`} />
        <Seg<LruOp>
          label="Operation"
          value={op}
          onChange={setOp}
          options={[
            { value: "get", label: "get (load on miss)" },
            { value: "set", label: "set" },
          ]}
        />
      </div>
      <div className="controls" style={{ marginTop: 0 }} role="group" aria-label={`Keys: press one to ${op} it`}>
        {KEYS.map((k) => (
          <button key={k} type="button" className="wbtn" style={{ minWidth: 40, justifyContent: "center", fontFamily: "var(--font-mono)" }} onClick={() => apply([{ op, key: k }])} aria-label={`${op}(${k})`}>
            {k}
          </button>
        ))}
        <button type="button" className="wbtn primary" onClick={() => apply([{ op: "get", key: pickKey(rand) }])}>
          <Dices size={14} aria-hidden /> Random access
        </button>
        <button type="button" className="wbtn" onClick={() => apply(Array.from({ length: 20 }, () => ({ op: "get" as const, key: pickKey(rand) })))}>
          ×20
        </button>
        <button type="button" className="wbtn" onClick={resetAll} aria-label="Reset" title="Reset">
          <RotateCcw size={14} aria-hidden />
        </button>
      </div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${W} 150`} className="sim-svg" role="img" aria-label={`Cache contents, most recent first: ${order.map(([k]) => k).join(", ") || "empty"}`}>
          <text x={PAD} y={18} className="muted-text" style={{ fontSize: 12 }}>
            ← most recent
          </text>
          <text x={slotX(capacity - 1) + BOX} y={18} textAnchor="end" className="muted-text" style={{ fontSize: 12 }}>
            least recent (evicted next) →
          </text>
          {Array.from({ length: capacity }, (_, i) => (
            <rect key={i} x={slotX(i)} y={Y} width={BOX} height={BOX} rx={10} fill="none" stroke="var(--border-strong)" strokeDasharray="4 4" />
          ))}
          {Array.from({ length: 8 - capacity }, (_, i) => (
            <rect key={`off${i}`} x={slotX(capacity + i)} y={Y} width={BOX} height={BOX} rx={10} fill="var(--card-2)" opacity={0.5} />
          ))}
          <AnimatePresence initial={false}>
            {order.map(([k, v], i) => {
              const touched = last?.key === k;
              const ring = touched ? (last!.op === "get" && !last!.hit ? "var(--series-2)" : "var(--series-1)") : "var(--border-strong)";
              const tag = touched ? (last!.op === "set" ? "set" : last!.hit ? "hit" : "miss") : "";
              return (
                <m.g
                  key={k}
                  initial={reduce ? false : { x: slotX(0), y: -30, opacity: 0 }}
                  animate={{ x: slotX(i), y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { y: 46, opacity: 0, transition: { duration: 0.7 } }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
                >
                  <rect y={Y} width={BOX} height={BOX} rx={10} fill="var(--card)" stroke={ring} strokeWidth={touched ? 3 : 1.5} />
                  <text x={BOX / 2} y={Y + BOX / 2 + 2} textAnchor="middle" style={{ fontWeight: 700, fontSize: 20 }}>
                    {k}
                  </text>
                  <text x={BOX / 2} y={Y + BOX - 7} textAnchor="middle" className="muted-text" style={{ fontSize: 11 }}>
                    v{v}
                  </text>
                  {tag && (
                    <m.text key={`${last!.seq}`} x={BOX / 2} y={Y - 6} textAnchor="middle" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 11.5, fontWeight: 700, fill: tag === "miss" ? "var(--warning-ink)" : "var(--good-ink)" }}>
                      {tag === "hit" ? "✓ hit" : tag === "miss" ? "miss → load" : "✎ set"}
                    </m.text>
                  )}
                </m.g>
              );
            })}
          </AnimatePresence>
          {last?.evicted && (
            <g key={`ev${last.seq}`}>
              <m.text
                x={slotX(Math.max(0, last.evictedFrom)) + BOX / 2}
                textAnchor="middle"
                initial={reduce ? false : { y: Y + BOX + 8, opacity: 0 }}
                animate={{ y: Y + BOX + 26, opacity: 1 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.2 }}
                style={{ fontSize: 12, fontWeight: 700, fill: "var(--critical-ink)" }}
              >
                ✕ {last.evicted} evicted
              </m.text>
            </g>
          )}
        </svg>
      </div>
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="stat-label">Hits</div>
          <div className="stat-value">{stats.hits}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Misses</div>
          <div className="stat-value">{stats.misses}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Hit ratio</div>
          <div className="stat-value">{gets ? `${ratio}%` : "–"}</div>
          <div className="stat-sub">of {gets} gets</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Evictions</div>
          <div className="stat-value">{stats.evictions}</div>
        </div>
      </div>
      <p className="readout" aria-live="polite">
        {sentence} <span className="muted">Order, most → least recent: {order.map(([k]) => k).join(", ") || "empty"}.</span>
      </p>
    </WidgetFrame>
  );
}
