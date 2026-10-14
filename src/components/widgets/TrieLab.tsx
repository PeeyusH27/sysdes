"use client";
import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Plus } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- trie (pure, tested)
export interface TNode {
  ch: string;
  parent: number;
  kids: Record<string, number>;
  end: boolean;
  depth: number;
}
/** Node 0 is the root (the empty prefix). Nodes are never removed, so ids are stable. */
export type Trie = TNode[];
export const MAX_LEN = 8;
export const MAX_NODES = 48;
export const MAX_WORDS = 14;
export const emptyTrie = (): Trie => [{ ch: "", parent: -1, kids: {}, end: false, depth: 0 }];
export const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "").slice(0, MAX_LEN);

export function insert(t: Trie, word: string): { trie: Trie; path: number[]; created: number[] } {
  const trie = t.map((n) => ({ ...n, kids: { ...n.kids } }));
  const path = [0];
  const created: number[] = [];
  let cur = 0;
  for (const ch of word) {
    let nx = trie[cur].kids[ch];
    if (nx === undefined) {
      nx = trie.length;
      trie.push({ ch, parent: cur, kids: {}, end: false, depth: trie[cur].depth + 1 });
      trie[cur].kids[ch] = nx;
      created.push(nx);
    }
    path.push(nx);
    cur = nx;
  }
  trie[cur].end = true;
  return { trie, path, created };
}
export const buildTrie = (words: string[]) => words.reduce((t, w) => insert(t, w).trie, emptyTrie());

/** Follow one edge per character; failAt is the index of the first missing character (-1 if the whole prefix exists). */
export function walk(t: Trie, prefix: string) {
  const path = [0];
  let cur = 0;
  for (let i = 0; i < prefix.length; i++) {
    const nx = t[cur].kids[prefix[i]];
    if (nx === undefined) return { path, node: null, failAt: i };
    path.push(nx);
    cur = nx;
  }
  return { path, node: cur as number | null, failAt: -1 };
}
export const search = (t: Trie, w: string) => {
  const r = walk(t, w);
  return r.node !== null && t[r.node].end;
};
export const startsWith = (t: Trie, p: string) => walk(t, p).node !== null;
/** Child lookups the walk makes: one per character, stopping at the first miss. */
export const trieSteps = (t: Trie, p: string) => {
  const r = walk(t, p);
  return r.failAt < 0 ? p.length : r.failAt + 1;
};

export function wordOf(t: Trie, id: number) {
  let s = "";
  for (let i = id; i > 0; i = t[i].parent) s = t[i].ch + s;
  return s;
}
const kidsOf = (t: Trie, id: number) =>
  Object.keys(t[id].kids)
    .sort()
    .map((c) => t[id].kids[c]);

/** Every word in the subtree under `id`, alphabetically (a DFS: autocomplete). */
export function wordsBelow(t: Trie, id: number, limit = Infinity): string[] {
  const out: string[] = [];
  const dfs = (i: number) => {
    if (out.length >= limit) return;
    if (t[i].end) out.push(wordOf(t, i));
    for (const k of kidsOf(t, i)) dfs(k);
  };
  dfs(id);
  return out;
}
export const subtree = (t: Trie, id: number): number[] => [id, ...kidsOf(t, id).flatMap((k) => subtree(t, k))];

/** "." matches any one letter: a letter follows one edge, a dot branches into every child. */
export function wildcard(t: Trie, pattern: string) {
  const visited: number[] = [];
  const matches: number[] = [];
  const dfs = (i: number, k: number) => {
    visited.push(i);
    if (k === pattern.length) {
      if (t[i].end) matches.push(i);
      return;
    }
    const c = pattern[k];
    if (c === ".") for (const nx of kidsOf(t, i)) dfs(nx, k + 1);
    else if (t[i].kids[c] !== undefined) dfs(t[i].kids[c], k + 1);
  };
  dfs(0, 0);
  return { visited, matches };
}

/** Brute force: compare the prefix against every word, letter by letter, stopping at the first mismatch. */
export function scanCost(words: string[], prefix: string) {
  let checks = 0;
  for (const w of words)
    for (let i = 0; i < prefix.length && i < w.length; i++) {
      checks++;
      if (w[i] !== prefix[i]) break;
    }
  return checks;
}

/** Leaves get columns left to right (alphabetical DFS); a parent sits over the middle of its children. */
export function layoutTrie(t: Trie, col = 34, row = 40) {
  const pos: { x: number; y: number }[] = [];
  let next = 0;
  const place = (i: number): number => {
    const ks = kidsOf(t, i);
    const xs = ks.map(place);
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : next++ * col;
    pos[i] = { x, y: t[i].depth * row };
    return x;
  };
  place(0);
  return { pos, width: Math.max(0, next - 1) * col, depth: Math.max(...t.map((n) => n.depth)) };
}

// ---------------------------------------------------------------- widget
const STEP_MS = 420;
const R = 13;
const ROW = 42;
const TOP = 26;
const INITIAL = ["car", "cat", "cart", "dog"];
const DEMO = ["care", "do", "tea", "ten", "tent", "to"];
/** The trie never draws taller than this (px): deep words shrink it instead of pushing the controls off screen. */
const MAX_TRIE_PX = 260;

interface Ins {
  word: string;
  path: number[];
  created: number[];
  k: number;
}
interface S {
  trie: Trie;
  words: string[];
  todo: string[];
  ins: Ins | null;
  acc: number;
  msg: string;
}
const initS = (): S => ({ trie: buildTrie(INITIAL), words: INITIAL, todo: DEMO, ins: null, acc: 0, msg: `${INITIAL.length} words loaded. More are on the way: watch them grow.` });

function start(s: S, word: string): S {
  if (s.words.includes(word)) return { ...s, msg: `"${word}" is already in the trie: same path, same end flag. Nothing to add.` };
  if (s.words.length >= MAX_WORDS || s.trie.length + word.length > MAX_NODES) return { ...s, msg: "The trie is full for this demo: press Reset to start over." };
  const r = insert(s.trie, word);
  return { ...s, trie: r.trie, ins: { word, path: r.path, created: r.created, k: 0 }, msg: `Insert "${word}": start at the root.` };
}
function finish(s: S): S {
  const ins = s.ins;
  if (!ins) return s;
  const reused = ins.path.length - 1 - ins.created.length;
  return { ...s, ins: null, words: [...s.words, ins.word], msg: `"${ins.word}": ${reused ? `reused ${reused} node${reused === 1 ? "" : "s"}` : "no shared prefix"}, grew ${ins.created.length}, and marked the end. ${s.trie.length} nodes hold ${s.words.length + 1} words.` };
}
/** One letter of the current insert, or start the next queued word. */
export function advance(s: S): S {
  if (s.ins) {
    const { path, created, k, word } = s.ins;
    if (k >= path.length - 1) return finish(s);
    const id = path[k + 1];
    const grew = created.includes(id);
    return { ...s, ins: { ...s.ins, k: k + 1 }, msg: `"${word.slice(0, k + 1)}": ${grew ? `no '${word[k]}' edge yet, so grow a new node` : `the '${word[k]}' edge exists, so reuse it`}.` };
  }
  if (s.todo.length) return start({ ...s, todo: s.todo.slice(1) }, s.todo[0]);
  return s;
}
function tick(s: S, dt: number): S {
  if (!s.ins && !s.todo.length) return s;
  if (s.acc + dt < STEP_MS) return { ...s, acc: s.acc + dt };
  return { ...advance(s), acc: 0 };
}
/** Insert a word straight away (the reader's own word, or any word with reduced motion). */
export function insertNow(s: S, word: string): S {
  let out = start(finish(s), word);
  while (out.ins) out = advance(out);
  return out;
}

export function TrieLab() {
  const [word, setWord] = useState("");
  const [query, setQuery] = useState("ca");
  const [say, setSay] = useState<"insert" | "query">("insert");
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [s, reset] = useFixedStep<S>(initS, tick, running && inView && !reduce);
  const idle = !s.ins && !s.todo.length;
  if (running && idle) setRunning(false);

  const t = s.trie;
  const words = s.words; // the word being inserted counts once it is finished
  const q = query.toLowerCase().replace(/[^a-z.]/g, "").slice(0, MAX_LEN);
  const wild = q.includes(".");
  const w = walk(t, q);
  const wc = wild ? wildcard(t, q) : null;
  const below = !wild && w.node !== null ? subtree(t, w.node) : [];
  const sugg = !wild && w.node !== null ? wordsBelow(t, w.node, 8) : [];
  const onPath = new Set(wild ? [] : w.path);

  // hide nodes the running insert hasn't reached yet, and its end flag until the last step
  const hidden = new Set(s.ins ? s.ins.created.filter((id) => s.ins!.path.indexOf(id) > s.ins!.k) : []);
  const pendingEnd = s.ins ? s.ins.path[s.ins.path.length - 1] : -1;
  const visible = t.map((_, i) => i).filter((i) => !hidden.has(i));
  const lay = layoutTrie(t, 42, ROW);
  const W = Math.max(340, lay.width + 60);
  const H = TOP + lay.depth * ROW + 34;
  const ox = (W - lay.width) / 2;
  const P = (i: number) => ({ x: ox + lay.pos[i].x, y: TOP + lay.pos[i].y });
  const walker = s.ins ? s.ins.path[s.ins.k] : null;
  const tween = { duration: reduce ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] as const };

  let qText: string;
  if (!q) qText = "Type a prefix to walk it, or use . for any letter.";
  else if (wild) qText = `"${q}": a letter follows one edge, a dot tries every child. Explored ${wc!.visited.length} of ${t.length} nodes; ${wc!.matches.length ? `matches: ${wc!.matches.map((i) => wordOf(t, i)).join(", ")} ✓` : "no match ✕"}.`;
  else if (w.node === null) qText = `"${q}": ${w.failAt ? `"${q.slice(0, w.failAt)}" exists, then ` : ""}no '${q[w.failAt]}' edge, so stop after ${w.failAt + 1} lookup${w.failAt ? "s" : ""}. No word starts with "${q}" ✕.`;
  else qText = `"${q}": ${q.length} lookup${q.length === 1 ? "" : "s"}, one per letter. search("${q}") is ${t[w.node].end} ${t[w.node].end ? "✓" : "(no end flag here)"}; startsWith("${q}") is true, with ${sugg.length} completion${sugg.length === 1 ? "" : "s"}${sugg.length ? `: ${sugg.join(", ")}` : ""}.`;
  const said = useThrottled(say === "insert" ? s.msg : qText, 600);
  const label = `Trie with ${t.length} nodes holding ${words.length} words: ${words.join(", ")}.${q ? ` Query ${q}: ${qText}` : ""}`;

  const doInsert = () => {
    const c = cleanWord(word);
    setSay("insert");
    if (!c) return reset({ ...s, msg: "Type a word with letters a to z, then Insert." });
    setWord("");
    if (reduce) return reset(insertNow(s, c));
    reset(start(finish(s), c));
    setRunning(true);
  };

  const sim = (
    <SimButtons
      running={running && !reduce}
      reduce={reduce}
      onToggle={() => {
        setSay("insert");
        if (!idle) return setRunning((r) => !r);
        const more = DEMO.filter((d) => !s.words.includes(d));
        if (!more.length) return reset({ ...s, msg: "All the sample words are in. Type your own, or Reset." });
        reset({ ...s, todo: more });
        setRunning(true);
      }}
      onStep={() => {
        setSay("insert");
        const more = DEMO.filter((d) => !s.words.includes(d));
        if (idle && !more.length) return reset({ ...s, msg: "All the sample words are in. Type your own, or Reset." });
        reset(advance(idle ? { ...s, todo: more } : s));
      }}
      stepHint="Grow or reuse one node"
      onReset={() => {
        setRunning(false);
        setSay("insert");
        reset({ ...initS(), todo: [], msg: `Back to ${INITIAL.join(", ")}. Run grows the sample words again.` });
      }}
    />
  );

  return (
    <WidgetFrame title="Prefix tree workshop" sub="Each node is a prefix; each edge adds one letter. Insert words and watch shared prefixes reuse nodes. Type a prefix to walk it and get completions.">
      <form
        className="controls"
        style={{ alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          doInsert();
        }}
      >
        {sim}
        <label className="control" htmlFor={`${uid}w`} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "0 1 190px" }}>
          <span style={{ whiteSpace: "nowrap" }}>Add a word</span>
          <input id={`${uid}w`} type="text" value={word} onChange={(e) => setWord(e.target.value)} spellCheck={false} autoComplete="off" placeholder="e.g. cab" style={{ flex: 1, minWidth: 0 }} />
        </label>
        <button type="submit" className="wbtn primary">
          <Plus size={14} aria-hidden /> Insert
        </button>
      </form>

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: Math.min(Math.max(W, 460), (MAX_TRIE_PX / H) * W), margin: "0 auto" }}>
          {visible
            .filter((i) => i > 0)
            .map((i) => {
              const a = P(t[i].parent);
              const b = P(i);
              const hot = onPath.has(i);
              return (
                <m.line key={i} initial={false} animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }} transition={tween} stroke={hot ? "var(--accent)" : "var(--border-strong)"} strokeWidth={hot ? 3 : 1.5} />
              );
            })}
          {walker !== null && (
            <m.g initial={false} animate={{ x: P(walker).x, y: P(walker).y }} transition={tween}>
              <circle r={R + 6} fill="none" stroke="var(--series-2)" strokeWidth={2.5} strokeDasharray="5 3" />
            </m.g>
          )}
          <AnimatePresence initial={false}>
            {visible.map((i) => {
              const p = P(i);
              const from = i > 0 ? P(t[i].parent) : p;
              const end = t[i].end && i !== pendingEnd;
              const lit = onPath.has(i) && q.length > 0;
              const match = wc?.matches.includes(i);
              const explored = wc?.visited.includes(i);
              const fill = lit
                ? "color-mix(in srgb, var(--accent) 30%, var(--card))"
                : below.includes(i)
                  ? "color-mix(in srgb, var(--series-1) 14%, var(--card))"
                  : explored
                    ? "color-mix(in srgb, var(--series-3) 18%, var(--card))"
                    : "var(--card-2)";
              return (
                <m.g
                  key={i}
                  initial={reduce ? false : { x: from.x, y: from.y, scale: 0.2, opacity: 0 }}
                  animate={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                  transition={tween}
                >
                  {end && <circle r={R + 4} fill="none" stroke={match ? "var(--good)" : "var(--fg)"} strokeOpacity={match ? 1 : 0.75} strokeWidth={match ? 2.4 : 1.3} />}
                  <circle r={R} fill={fill} stroke={lit ? "var(--accent)" : match ? "var(--good)" : "var(--border-strong)"} strokeWidth={lit || match ? 2.2 : 1.3} />
                  <text y={i ? 5 : 4} textAnchor="middle" style={{ fontSize: i ? 15 : 10.5, fontWeight: i ? 700 : 600 }} className={i ? undefined : "muted-text"}>
                    {i ? t[i].ch : "root"}
                  </text>
                </m.g>
              );
            })}
          </AnimatePresence>
          {!wild && q && w.node === null && (
            <m.g initial={false} animate={{ x: P(w.path[w.path.length - 1]).x, y: P(w.path[w.path.length - 1]).y }} transition={tween}>
              <circle r={R + 2} fill="none" stroke="var(--critical)" strokeWidth={2.4} />
              <text x={R - 2} y={-R + 2} style={{ fontSize: 12, fontWeight: 800, fill: "var(--critical-ink)", paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}>
                ✕
              </text>
            </m.g>
          )}
        </svg>
      </div>
      {/* the query sits with its answer: type a prefix, read the completions on the same row */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6 }}>
        <label className="control" htmlFor={`${uid}q`} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "0 1 230px" }}>
          <span style={{ whiteSpace: "nowrap" }} title="A dot matches any one letter">
            Search a prefix (. = any)
          </span>
          <input
            id={`${uid}q`}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSay("query");
            }}
            spellCheck={false}
            autoComplete="off"
            style={{ flex: 1, minWidth: 60 }}
          />
        </label>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {wild ? "Matches:" : "Completions:"}
        </span>
        {(wild ? wc!.matches.map((i) => wordOf(t, i)) : sugg).map((x) => (
          <button
            key={x}
            type="button"
            className="pill"
            style={{ color: "var(--accent)", background: "transparent", cursor: "pointer" }}
            onClick={() => {
              setQuery(x);
              setSay("query");
            }}
          >
            {x}
          </button>
        ))}
        {!(wild ? wc!.matches.length : sugg.length) && (
          <span className={q && !wild && w.node === null ? "bad-ink" : "muted"} style={{ fontSize: 12.5 }}>
            {q && !wild && w.node === null ? `✕ none: no '${q[w.failAt]}' after "${q.slice(0, w.failAt)}"` : "none"}
          </span>
        )}
      </div>
      <div className="muted" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, marginTop: 4 }}>
        {wild ? (
          <span>
            Nodes explored{" "}
            <b style={{ color: "var(--fg)" }}>
              {wc!.visited.length}/{t.length}
            </b>
          </span>
        ) : (
          <span>
            Trie lookups <b style={{ color: "var(--fg)" }}>{trieSteps(t, q)}</b> (one per letter)
          </span>
        )}
        {!wild && (
          <span>
            Scanning all {words.length} words: <b style={{ color: "var(--fg)" }}>{scanCost(words, q)}</b> letter checks
          </span>
        )}
        <span>Double ring = end of a word</span>
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: no auto-play; Step grows one node, Insert adds a word at once." />
      </p>
    </WidgetFrame>
  );
}
