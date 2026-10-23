"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Seg, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure model */

export type Status = "running" | "waiting" | "done";
export interface LockState {
  /** The locks each thread takes, in order. After the last one it does its work and releases everything. */
  orders: string[][];
  /** How many locks each thread has acquired. */
  pc: number[];
  holder: Record<string, number | null>;
  status: Status[];
}

export const initLocks = (orders: string[][]): LockState => ({
  orders,
  pc: orders.map(() => 0),
  holder: Object.fromEntries([...new Set(orders.flat())].map((l) => [l, null])),
  status: orders.map(() => "running" as Status),
});

/** One move by thread `i`: take its next lock (or wait if another thread holds it), or finish and release all. */
export function stepThread(s: LockState, i: number): LockState {
  if (s.status[i] === "done") return s;
  const holder = { ...s.holder };
  const pc = [...s.pc];
  const status = [...s.status];
  if (pc[i] === s.orders[i].length) {
    for (const l of Object.keys(holder)) if (holder[l] === i) holder[l] = null;
    status[i] = "done";
  } else {
    const want = s.orders[i][pc[i]];
    if (holder[want] === null || holder[want] === i) {
      holder[want] = i;
      pc[i] += 1;
      status[i] = "running";
    } else status[i] = "waiting";
  }
  return { ...s, holder, pc, status };
}

/** The lock thread `i` is blocked on, or null. */
export const waitingFor = (s: LockState, i: number): string | null => (s.status[i] === "waiting" ? s.orders[i][s.pc[i]] : null);

/** A cycle in the wait-for graph (thread -> holder of the lock it wants), as thread indexes, or null. */
export function findDeadlock(s: LockState): number[] | null {
  for (let start = 0; start < s.orders.length; start++) {
    const seen: number[] = [];
    let at: number | null = start;
    while (at !== null && !seen.includes(at)) {
      seen.push(at);
      const l = waitingFor(s, at);
      at = l === null ? null : s.holder[l];
    }
    if (at !== null) return seen.slice(seen.indexOf(at));
  }
  return null;
}

/** Play a schedule (thread indexes) and return the final state. */
export const play = (orders: string[][], schedule: number[]): LockState => schedule.reduce(stepThread, initLocks(orders));

export const ORDERS = {
  opposite: [["A", "B"], ["B", "A"]],
  same: [["A", "B"], ["A", "B"]],
} as const;

/* ------------------------------------------------------------------ view */

const CSS = `
.dl { container: dl / inline-size; }
.dl-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 8px 0; }
.dl-card { border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; background: var(--card-2); font-size: 13px; }
.dl-card h4 { margin: 0 0 4px; font-size: 13.5px; }
.dl-card ol { margin: 0; padding-left: 18px; }
.dl-card li { margin: 1px 0; color: var(--muted); }
.dl-card li[data-on="true"] { color: var(--fg); font-weight: 650; }
.dl-card[data-dead="true"] { border-color: var(--critical); }
.dl-lock { display: flex; justify-content: space-between; gap: 6px; padding: 2px 0; }
@container dl (max-width: 519px) { .dl-grid { grid-template-columns: minmax(0, 1fr); } }
`;

const nameOf = (i: number) => `Thread ${i + 1}`;

export function DeadlockLab() {
  const [mode, setMode] = useState<keyof typeof ORDERS>("opposite");
  const [s, setS] = useState(() => initLocks(ORDERS.opposite.map((o) => [...o])));
  const dead = findDeadlock(s);
  const allDone = s.status.every((x) => x === "done");
  const pick = (m: keyof typeof ORDERS) => {
    setMode(m);
    setS(initLocks(ORDERS[m].map((o) => [...o])));
  };
  const round = () => setS((x) => stepThread(stepThread(x, 0), 1));
  const reading = dead
    ? `Deadlock: ${dead.map(nameOf).join(" waits for ")} waits for ${nameOf(dead[0])}. No thread can move, so none ever will.`
    : allDone
      ? "Both threads finished. With the same lock order nobody waits in a circle."
      : "Press Step on a thread, or Alternate, to interleave them.";
  return (
    <WidgetFrame title="Deadlock lab" sub="Each thread takes two locks, then works, then releases both. Interleave them with opposite lock orders, then with the same order.">
      <style href="w-deadlock-lab" precedence="widgets">
        {CSS}
      </style>
      <div className="dl">
        <div className="controls">
          <Seg label="Lock order" value={mode} onChange={pick} options={[{ value: "opposite", label: "Opposite (A,B and B,A)" }, { value: "same", label: "Same (A,B and A,B)" }]} />
          <button type="button" className="wbtn" onClick={() => setS((x) => stepThread(x, 0))} disabled={allDone || !!dead}>
            Step thread 1
          </button>
          <button type="button" className="wbtn" onClick={() => setS((x) => stepThread(x, 1))} disabled={allDone || !!dead}>
            Step thread 2
          </button>
          <button type="button" className="wbtn primary" onClick={round} disabled={allDone || !!dead}>
            Alternate
          </button>
          <button type="button" className="wbtn" onClick={() => pick(mode)} aria-label="Reset">
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
        </div>
        <div className="dl-grid">
          {s.orders.map((order, i) => (
            <div key={i} className="dl-card" data-dead={dead?.includes(i) || undefined}>
              <h4>
                {nameOf(i)} <span className={s.status[i] === "waiting" ? "bad-ink" : s.status[i] === "done" ? "ok-ink" : "muted"}>{s.status[i]}</span>
              </h4>
              <ol>
                {order.map((l, k) => (
                  <li key={k} data-on={s.pc[i] > k}>
                    lock {l}
                    {s.pc[i] > k ? " (held)" : waitingFor(s, i) === l ? " (blocked)" : ""}
                  </li>
                ))}
                <li data-on={s.status[i] === "done"}>work, release both</li>
              </ol>
            </div>
          ))}
          <div className="dl-card">
            <h4>Locks</h4>
            {Object.entries(s.holder).map(([l, h]) => (
              <div key={l} className="dl-lock">
                <span>Lock {l}</span>
                <span className="muted">{h === null ? "free" : `held by ${nameOf(h)}`}</span>
              </div>
            ))}
          </div>
        </div>
        <p className={`readout ${dead ? "bad-ink" : allDone ? "ok-ink" : ""}`} aria-live="polite">
          {reading}
        </p>
      </div>
    </WidgetFrame>
  );
}
