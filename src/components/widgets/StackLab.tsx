"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Delete, Dices } from "lucide-react";
import { mulberry32 } from "@/lib/rng";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- brackets (pure, tested)
const PAIR: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const isOpen = (c: string) => c === "(" || c === "[" || c === "{";
const isClose = (c: string) => c in PAIR;

export type BracketEvent =
  | { kind: "push" | "skip" | "extra"; i: number }
  | { kind: "pop"; i: number; opener: number }
  | { kind: "mismatch"; i: number; opener: number };
export interface BracketFrame {
  /** Characters processed so far. */
  pos: number;
  /** Indices of the openers still waiting, bottom first. */
  stack: number[];
  event: BracketEvent | null;
  verdict: "running" | "balanced" | "crossed" | "unclosed";
}

/** One frame per character; the run stops at the first closer that can't match. */
export function bracketFrames(s: string): BracketFrame[] {
  const frames: BracketFrame[] = [{ pos: 0, stack: [], event: null, verdict: s.length ? "running" : "balanced" }];
  let stack: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    let event: BracketEvent;
    if (isOpen(c)) {
      stack = [...stack, i];
      event = { kind: "push", i };
    } else if (!isClose(c)) event = { kind: "skip", i };
    else if (!stack.length) event = { kind: "extra", i };
    else {
      const opener = stack[stack.length - 1];
      if (s[opener] !== PAIR[c]) {
        frames.push({ pos: i + 1, stack, event: { kind: "mismatch", i, opener }, verdict: "crossed" });
        return frames;
      }
      stack = stack.slice(0, -1);
      event = { kind: "pop", i, opener };
    }
    const end = i === s.length - 1;
    const verdict = event.kind === "extra" ? "crossed" : !end ? "running" : stack.length ? "unclosed" : "balanced";
    frames.push({ pos: i + 1, stack, event, verdict });
    if (event.kind === "extra") return frames;
  }
  return frames;
}

/** Reference answer: delete adjacent pairs until nothing changes. O(n²), but obviously right. */
export function bruteBalanced(s: string) {
  let t = [...s].filter((c) => isOpen(c) || isClose(c)).join("");
  for (;;) {
    const u = t.replace(/\(\)|\[\]|\{\}/g, "");
    if (u === t) return t === "";
    t = u;
  }
}

/** The tempting shortcut: one counter per bracket type. It can't see order, so "([)]" passes. */
export function countsLookBalanced(s: string) {
  const open: Record<string, number> = { "(": 0, "[": 0, "{": 0 };
  for (const c of s) {
    if (isOpen(c)) open[c]++;
    else if (isClose(c) && --open[PAIR[c]] < 0) return false;
  }
  return Object.values(open).every((v) => v === 0);
}

// ---------------------------------------------------------------- next greater (pure, tested)
export interface NgeFrame {
  /** Index processed in this frame (-1 for the start). */
  i: number;
  /** Indices waiting for a greater value; their values never increase from bottom to top. */
  stack: number[];
  /** ans[j] = index of j's next greater element, -1 while unknown or if none. */
  ans: number[];
  popped: number[];
  comparisons: number;
}

export function ngeFrames(nums: number[]): NgeFrame[] {
  const ans = nums.map(() => -1);
  const frames: NgeFrame[] = [{ i: -1, stack: [], ans: [...ans], popped: [], comparisons: 0 }];
  let stack: number[] = [];
  let comparisons = 0;
  nums.forEach((x, i) => {
    const popped: number[] = [];
    for (;;) {
      if (!stack.length) break;
      comparisons++;
      const top = stack[stack.length - 1];
      if (nums[top] >= x) break;
      ans[top] = i;
      popped.push(top);
      stack = stack.slice(0, -1);
    }
    stack = [...stack, i];
    frames.push({ i, stack, ans: [...ans], popped, comparisons });
  });
  return frames;
}

/** Scan right from every index until something bigger turns up. */
export function bruteNextGreater(nums: number[]) {
  let comparisons = 0;
  const ans = nums.map((x, i) => {
    for (let j = i + 1; j < nums.length; j++) {
      comparisons++;
      if (nums[j] > x) return j;
    }
    return -1;
  });
  return { ans, comparisons };
}

export function parseNums(text: string, max = 8) {
  return text
    .split(/[\s,]+/)
    .filter((t) => /^\d+$/.test(t))
    .map((t) => Math.min(99, Number(t)))
    .slice(0, max);
}

// ---------------------------------------------------------------- picture
type Mode = "brackets" | "nge";
const MAX_CHARS = 12;
const STEP_MS = 750;
const PLATE_H = 21;
const SHOWN = 7; // plates drawn; deeper ones collapse into "+k below"

interface Sim {
  pos: number;
  total: number;
  acc: number;
}
const stepSim = (s: Sim, dt: number): Sim => {
  if (s.pos >= s.total) return s;
  const acc = s.acc + dt;
  return acc >= STEP_MS ? { ...s, pos: s.pos + 1, acc: 0 } : { ...s, acc };
};

function describeBrackets(s: string, f: BracketFrame) {
  const e = f.event;
  if (!s) return "Empty string: nothing to match, so it is balanced. Tap some brackets.";
  if (!e) return "Tap or type brackets. Each opener goes on the stack; each closer must match the top.";
  const c = s[e.i];
  const tail = f.verdict === "balanced" ? " ✓ Balanced: the stack is empty." : f.verdict === "unclosed" ? ` ✕ Not balanced: ${f.stack.length} never closed (${f.stack.map((j) => s[j]).join(" ")}).` : "";
  switch (e.kind) {
    case "push":
      return `${c} opens: push it. ${f.stack.length} waiting.${tail}`;
    case "skip":
      return `"${c}" isn't a bracket: skip it.${tail}`;
    case "extra":
      return `✕ ${c} has nothing to close: the stack is empty, so the string is invalid.`;
    case "pop":
      return `${c} matches the ${s[e.opener]} on top (index ${e.opener}): pop it.${tail}`;
    case "mismatch":
      return `✕ ${c} arrives, but the top is ${s[e.opener]} from index ${e.opener}: the pairs cross, so it is invalid.${countsLookBalanced(s) ? " Counting alone would call it balanced." : ""}`;
  }
}

function describeNge(nums: number[], f: NgeFrame, done: boolean, brute: number) {
  if (!nums.length) return "Type a few numbers, separated by spaces.";
  if (f.i < 0) return "Each number waits on the stack until a bigger one arrives. Press Run or Step.";
  const x = nums[f.i];
  const head = f.popped.length
    ? `${x} arrives and beats ${f.popped.map((j) => nums[j]).join(", ")}: ${f.popped.length === 1 ? "that one has" : "they have"} found ${f.popped.length === 1 ? "its" : "their"} next greater. Push ${x}.`
    : `${x} arrives: it isn't bigger than the top, so it waits too. Push ${x}.`;
  if (!done) return head;
  const left = f.stack.map((j) => nums[j]);
  return `${head} Done in ${f.comparisons} comparisons (scanning right from every index: ${brute}). Still waiting, so -1: ${left.join(", ")}.`;
}

export function StackLab() {
  const [mode, setMode] = useState<Mode>("brackets");
  const [text, setText] = useState("{[()]}");
  const [numText, setNumText] = useState("8 6 7 3 5 2 4 9");
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const narrow = useNarrow(ref, 470);

  const nums = useMemo(() => parseNums(numText), [numText]);
  const bFrames = useMemo(() => bracketFrames(text), [text]);
  const nFrames = useMemo(() => ngeFrames(nums), [nums]);
  const total = (mode === "brackets" ? bFrames.length : nFrames.length) - 1;
  const [sim, reset] = useFixedStep<Sim>({ pos: 0, total: bracketFrames("{[()]}").length - 1, acc: 0 }, stepSim, running && inView && !reduce);
  const pos = Math.min(sim.pos, total);
  const done = pos >= total;

  // A desktop pane gets a landscape picture (row on the left, plates on the right); a phone keeps a squarer one.
  const W = narrow ? 330 : 600;
  const H = narrow ? 216 : 190;
  const PILE_W = narrow ? 76 : 104;
  const PX = W - PILE_W - 8;
  const LEFT_W = PX - 22;
  const pileY = (k: number) => H - 22 - k * PLATE_H;

  const restart = (t: number, keepRunning = false) => {
    reset({ pos: 0, total: t, acc: 0 });
    if (!keepRunning) setRunning(false);
  };
  const changeMode = (md: Mode) => {
    setMode(md);
    restart((md === "brackets" ? bFrames.length : nFrames.length) - 1);
  };
  /** Typing at the end plays the new character at once; any other edit rewinds to the first change. */
  const editBrackets = (next: string) => {
    const t = next.slice(0, MAX_CHARS);
    const frames = bracketFrames(t);
    let same = 0;
    while (same < Math.min(t.length, text.length) && t[same] === text[same]) same++;
    const caughtUp = sim.pos >= total;
    const p = caughtUp && same === text.length ? frames.length - 1 : Math.min(sim.pos, same);
    setText(t);
    reset({ pos: p, total: frames.length - 1, acc: 0 });
  };
  const editNums = (t: string) => {
    setNumText(t);
    restart(ngeFrames(parseNums(t)).length - 1, running);
  };
  const shuffle = () => {
    const r = mulberry32(seed * 977);
    setSeed((x) => x + 1);
    editNums(Array.from({ length: 8 }, () => 1 + Math.floor(r() * 20)).join(" "));
  };

  const bf = bFrames[Math.min(pos, bFrames.length - 1)];
  const nf = nFrames[Math.min(pos, nFrames.length - 1)];
  const brute = useMemo(() => bruteNextGreater(nums), [nums]);
  const sentence = mode === "brackets" ? describeBrackets(text, bf) : describeNge(nums, nf, done, brute.comparisons);
  const said = useThrottled(sentence, 600);

  // ------------------------------------------------ geometry for the row on the left
  const count = mode === "brackets" ? Math.max(text.length, 1) : Math.max(nums.length, 1);
  const cell = Math.min(mode === "brackets" ? (narrow ? 28 : 38) : narrow ? 40 : 54, LEFT_W / count);
  const rowX = 14 + Math.max(0, (LEFT_W - count * cell) / 2);
  const cx = (i: number) => rowX + i * cell + cell / 2;
  const rowY = mode === "brackets" ? 64 : 104;
  const stackIdx = mode === "brackets" ? bf.stack : nf.stack;
  const hidden = Math.max(0, stackIdx.length - SHOWN);
  const visible = stackIdx.slice(hidden);
  const cursor = mode === "brackets" ? (bf.event ? bf.event.i : -1) : nf.i;
  const bad = mode === "brackets" && (bf.event?.kind === "mismatch" || bf.event?.kind === "extra");
  const maxV = Math.max(1, ...nums);
  /** Matched pairs so far (and the crossing pair, if any), drawn as arcs over the tape. */
  const pairs: [number, number, boolean][] = [];
  for (const f of bFrames.slice(1, pos + 1)) if (f.event?.kind === "pop" || f.event?.kind === "mismatch") pairs.push([f.event.opener, f.event.i, f.event.kind === "pop"]);

  const label =
    mode === "brackets"
      ? `Brackets ${text || "(empty)"}; processed ${bf.pos} of ${text.length}. Stack, bottom to top: ${bf.stack.map((j) => text[j]).join(" ") || "empty"}.`
      : `Numbers ${nums.join(", ")}. Stack, bottom to top: ${nf.stack.map((j) => nums[j]).join(", ") || "empty"}. Next greater so far: ${nums.map((x, j) => `${x}→${nf.ans[j] >= 0 ? nums[nf.ans[j]] : "?"}`).join(", ")}.`;

  const plate = (j: number, k: number) => {
    const top = k === visible.length - 1;
    const shake = top && bad && !reduce;
    const tone = top && bad ? "var(--critical)" : mode === "nge" && nf.i === j ? "var(--accent)" : "var(--border-strong)";
    return (
      <m.g
        key={`${mode}${j}`}
        initial={reduce ? false : { x: cx(j) - PILE_W / 2, y: rowY - 10, opacity: 0.3, scale: 0.6 }}
        animate={{ x: shake ? [PX, PX - 6, PX + 6, PX - 4, PX + 4, PX] : PX, y: pileY(k), opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { y: pileY(k) - 46, opacity: 0, transition: { duration: 0.45 } }}
        transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
      >
        <rect width={PILE_W} height={PLATE_H - 3} rx={8} fill={top && bad ? "color-mix(in srgb, var(--critical) 16%, var(--card))" : "var(--card)"} stroke={tone} strokeWidth={top ? 2 : 1.3} />
        <text x={PILE_W / 2} y={13.5} textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fontFamily: "var(--font-mono)" }}>
          {mode === "brackets" ? text[j] : nums[j]}
        </text>
        <text x={PILE_W - 6} y={13} textAnchor="end" className="muted-text" style={{ fontSize: 9.5 }}>
          #{j}
        </text>
      </m.g>
    );
  };

  return (
    <WidgetFrame title="Stack lab" sub="Plates go on and come off the top. Match brackets or find the next greater.">
      <div className="controls" style={{ alignItems: "center" }}>
        <Seg<Mode>
          labelMode="hidden"
          compact
          label="Mode"
          value={mode}
          onChange={changeMode}
          options={[
            { value: "brackets", label: "Bracket matcher" },
            { value: "nge", label: "Next greater" },
          ]}
        />
        <SimButtons
          running={running && !reduce && !done}
          reduce={reduce}
          onToggle={() => {
            if (!done) return setRunning((r) => !r);
            restart(total, true);
            setRunning(true);
          }}
          onStep={() => reset({ pos: Math.min(pos + 1, total), total, acc: 0 })}
          stepHint={mode === "brackets" ? "Read the next character" : "Process the next number"}
          onReset={() => restart(total)}
        />
        {mode === "nge" && (
          <button type="button" className="wbtn" onClick={shuffle}>
            <Dices size={14} aria-hidden /> Shuffle
          </button>
        )}
      </div>
      {mode === "brackets" && (
        <div className="controls" style={{ marginTop: 0 }}>
          <div role="group" aria-label="Bracket pad" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["(", ")", "[", "]", "{", "}"].map((c) => (
              <button key={c} type="button" className="wbtn" style={{ minWidth: 34, justifyContent: "center", fontFamily: "var(--font-mono)" }} onClick={() => editBrackets(text + c)} aria-label={`Add ${c}`} disabled={text.length >= MAX_CHARS}>
                {c}
              </button>
            ))}
            <button type="button" className="wbtn" onClick={() => editBrackets(text.slice(0, -1))} aria-label="Delete the last bracket" disabled={!text}>
              <Delete size={14} aria-hidden />
            </button>
            <button type="button" className="wbtn" onClick={() => editBrackets("([)]")} title="A crossing pair">
              ([)]
            </button>
          </div>
        </div>
      )}

      <div ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: narrow ? 520 : 680, margin: "0 auto" }}>
          {/* the stack: a spindle with plates */}
          <rect x={PX - 6} y={H - 4 - SHOWN * PLATE_H - 8} width={PILE_W + 12} height={SHOWN * PLATE_H + 10} rx={10} fill="var(--card-2)" stroke="var(--border)" />
          <text x={PX + PILE_W / 2} y={H - SHOWN * PLATE_H - 20} textAnchor="middle" className="muted-text" style={{ fontSize: 11.5, fontWeight: 650 }}>
            stack {stackIdx.length ? `(${stackIdx.length})` : "· empty"}
          </text>
          <AnimatePresence initial={false}>{visible.map((j, k) => plate(j, k))}</AnimatePresence>
          {hidden > 0 && (
            <text x={PX + PILE_W / 2} y={H - 1} textAnchor="middle" className="muted-text" style={{ fontSize: 10 }}>
              +{hidden} below
            </text>
          )}

          {mode === "brackets" ? (
            <g>
              {[...text].map((c, i) => {
                const seen = i < bf.pos;
                const open = bf.stack.includes(i);
                const matched = seen && !open && (isOpen(c) || isClose(c)) && !(bad && i === bf.event!.i);
                const wrong = bad && (i === bf.event!.i || (bf.event!.kind === "mismatch" && i === bf.event!.opener));
                const fill = wrong ? "color-mix(in srgb, var(--critical) 16%, var(--card))" : matched ? "color-mix(in srgb, var(--good) 16%, var(--card))" : "var(--card)";
                return (
                  <g key={i} opacity={seen || i === bf.pos ? 1 : 0.5}>
                    <rect x={cx(i) - cell / 2 + 1.5} y={rowY - 14} width={cell - 3} height={28} rx={6} fill={fill} stroke={wrong ? "var(--critical)" : open ? "var(--accent)" : "var(--border-strong)"} strokeWidth={open || wrong ? 2 : 1.2} />
                    <text x={cx(i)} y={rowY + 5} textAnchor="middle" style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                      {c}
                    </text>
                    <text x={cx(i)} y={rowY + 27} textAnchor="middle" className="muted-text" style={{ fontSize: 9.5 }}>
                      {wrong ? "✕" : matched ? "✓" : i}
                    </text>
                  </g>
                );
              })}
              {pairs.map(([a, b, ok]) => {
                const top = rowY - 15;
                const h = Math.min(40, 8 + 5 * (b - a));
                return (
                  <m.path
                    key={`${a}-${b}`}
                    d={`M${cx(a)} ${top} C${cx(a)} ${top - h}, ${cx(b)} ${top - h}, ${cx(b)} ${top}`}
                    fill="none"
                    stroke={ok ? "var(--good)" : "var(--critical)"}
                    strokeWidth={2}
                    strokeDasharray={ok ? undefined : "4 3"}
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduce ? 0 : 0.45 }}
                  />
                );
              })}
              {cursor >= 0 && (
                <m.g initial={false} animate={{ x: cx(cursor), y: rowY + 34 }} transition={{ duration: reduce ? 0 : 0.3 }}>
                  <path d="M0 -4 L5 3 L-5 3 Z" fill="var(--accent-2)" />
                  <text y={15} textAnchor="middle" style={{ fontSize: 11, fontWeight: 750, fill: "var(--accent-2)" }}>
                    i
                  </text>
                </m.g>
              )}
              <BracketVerdict f={bf} text={text} x={14} y={rowY + 82} />
            </g>
          ) : (
            <g>
              {nums.map((x, j) => {
                const h = 8 + (x / maxV) * 52;
                const waiting = nf.stack.includes(j);
                const answered = nf.ans[j] >= 0;
                const fresh = nf.popped.includes(j);
                const color = fresh ? "var(--good)" : nf.i === j ? "var(--accent)" : waiting ? "var(--accent-2)" : answered ? "color-mix(in srgb, var(--good) 45%, var(--border))" : "var(--border-strong)";
                return (
                  <g key={j}>
                    <m.rect x={cx(j) - cell * 0.3} width={cell * 0.6} rx={3} fill={color} initial={false} animate={{ y: 84 - h, height: h }} transition={{ duration: reduce ? 0 : 0.3 }} />
                    <rect x={cx(j) - cell / 2 + 2} y={rowY - 14} width={cell - 4} height={26} rx={6} fill="var(--card)" stroke={nf.i === j ? "var(--accent)" : "var(--border-strong)"} strokeWidth={nf.i === j ? 2 : 1.2} />
                    <text x={cx(j)} y={rowY + 4} textAnchor="middle" style={{ fontSize: 13, fontWeight: 750 }}>
                      {x}
                    </text>
                    <text x={cx(j)} y={rowY + 33} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: answered ? "var(--good-ink)" : "var(--muted)" }}>
                      {answered ? nums[nf.ans[j]] : done ? "-1" : j <= nf.i ? "…" : ""}
                    </text>
                  </g>
                );
              })}
              <text x={14} y={12} className="muted-text" style={{ fontSize: 10.5 }}>
                Under each box: its next greater (… = still waiting)
              </text>
              {nf.popped.map((j) => (
                <m.path
                  key={`${nf.i}-${j}`}
                  d={`M${cx(j)} ${rowY + 38} C${cx(j)} ${rowY + 72}, ${cx(nf.i)} ${rowY + 72}, ${cx(nf.i)} ${rowY + 38}`}
                  fill="none"
                  stroke="var(--good)"
                  strokeWidth={2}
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.5 }}
                />
              ))}
              {nums.length > 0 && nf.i >= 0 && (
                <m.g initial={false} animate={{ x: cx(nf.i), y: 92 }} transition={{ duration: reduce ? 0 : 0.3 }}>
                  <text textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 750, fill: "var(--accent)" }}>
                    i
                  </text>
                </m.g>
              )}
            </g>
          )}
        </svg>
      </div>

      <div role="group" aria-label="Operation counter" style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
        {mode === "brackets" ? (
          <>
            <span>
              Whole string, one counter per type: <b className={countsLookBalanced(text) ? "ok-ink" : "bad-ink"}>{countsLookBalanced(text) ? "✓ balanced" : "✕ unbalanced"}</b>
            </span>
            <span>
              With a stack: <b className={bruteBalanced(text) ? "ok-ink" : "bad-ink"}>{bruteBalanced(text) ? "✓ balanced" : "✕ invalid"}</b>
            </span>
          </>
        ) : (
          <>
            <span>
              Comparisons, stack: <b>{nf.comparisons}</b>
              {!done && " so far"}
            </span>
            <span>
              Scan right from every index: <b>{brute.comparisons}</b>
            </span>
          </>
        )}
      </div>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce} what="Reduced motion: use Step." />
      </p>
      <More label={mode === "brackets" ? "Type your own brackets" : "Type your own numbers"}>
        <div className="controls">
          {mode === "brackets" ? (
            <label className="control" style={{ minWidth: 140, flex: "1 1 140px", maxWidth: 320 }}>
              <span>Brackets (up to {MAX_CHARS})</span>
              <input type="text" value={text} maxLength={MAX_CHARS} onChange={(e) => editBrackets(e.target.value)} spellCheck={false} style={{ fontFamily: "var(--font-mono)" }} />
            </label>
          ) : (
            <label className="control" style={{ minWidth: 160, flex: "1 1 160px", maxWidth: 320 }}>
              <span>Numbers (up to 8)</span>
              <input type="text" value={numText} onChange={(e) => editNums(e.target.value)} inputMode="numeric" style={{ fontFamily: "var(--font-mono)" }} />
            </label>
          )}
        </div>
      </More>
    </WidgetFrame>
  );
}

function BracketVerdict({ f, text, x, y }: { f: BracketFrame; text: string; x: number; y: number }) {
  const msg =
    f.verdict === "balanced"
      ? text
        ? "✓ balanced"
        : "✓ empty is balanced"
      : f.verdict === "crossed"
        ? f.event?.kind === "extra"
          ? "✕ closer with nothing open"
          : `✕ ${text[f.event!.i]} can't close ${text[(f.event as { opener: number }).opener]}`
        : f.verdict === "unclosed"
          ? `✕ ${f.stack.length} left open`
          : `reading ${f.pos} of ${text.length}…`;
  const tone = f.verdict === "balanced" ? "var(--good-ink)" : f.verdict === "running" ? "var(--muted)" : "var(--critical-ink)";
  return (
    <text x={x} y={y} style={{ fontSize: 14, fontWeight: 800, fill: tone }}>
      {msg}
    </text>
  );
}
