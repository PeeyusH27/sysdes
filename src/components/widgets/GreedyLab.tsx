"use client";
import { useCallback, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Search, Undo2 } from "lucide-react";
import { useFixedStep } from "@/lib/sim-loop";
import { useNarrow } from "@/lib/hooks";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { More, Seg, Slider, WidgetFrame } from "./WidgetFrame";

// ---------------------------------------------------------------- model (pure, tested)
export const MAX_AMOUNT = 40;
export const MAX_COIN = 50;
export const PRESETS = { us: [25, 10, 5, 1], trap: [4, 3, 1], seven: [10, 7, 1] } as const;
export type Verdict = "same" | "worse" | "stuck" | "none";

/** "4, 3, 1" → [4, 3, 1]: unique whole numbers 1..50, largest first, at most 6. */
export function parseCoins(text: string): number[] {
  const nums = (text.match(/\d+/g) ?? []).map(Number).filter((x) => x >= 1 && x <= MAX_COIN);
  return [...new Set(nums)].sort((a, b) => b - a).slice(0, 6);
}

/** Largest coin that fits, again and again. `left` > 0 means greedy got stuck. */
export function greedyChange(coins: number[], amount: number) {
  const picks: number[] = [];
  let left = amount;
  for (const c of [...coins].sort((a, b) => b - a))
    while (left >= c) {
      picks.push(c);
      left -= c;
    }
  return { picks, left };
}

/** Fewest coins by DP over every amount 0..amount (null when no combination works). Coins listed largest first. */
export function bestChange(coins: number[], amount: number): number[] | null {
  const dp = Array<number>(amount + 1).fill(Infinity);
  const last = Array<number>(amount + 1).fill(0);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;
        last[a] = c;
      }
  if (dp[amount] === Infinity) return null;
  const out: number[] = [];
  for (let a = amount; a > 0; a -= last[a]) out.push(last[a]);
  return out.sort((x, y) => y - x);
}

export function verdict(coins: number[], amount: number): Verdict {
  const best = bestChange(coins, amount);
  const g = greedyChange(coins, amount);
  if (!best) return "none";
  if (g.left > 0) return "stuck";
  return g.picks.length > best.length ? "worse" : "same";
}

export const failures = (coins: number[], upto = MAX_AMOUNT) => Array.from({ length: upto }, (_, i) => verdict(coins, i + 1));
export const firstTrap = (coins: number[], upto = MAX_AMOUNT) => {
  const i = failures(coins, upto).findIndex((v) => v === "worse" || v === "stuck");
  return i < 0 ? null : i + 1;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------- view helpers
const RACK_Y = 34;
const TRAY_H = 58;
const PALETTE = ["var(--series-2)", "var(--series-3)", "var(--series-1)", "var(--k-gateway)", "var(--k-cache)", "var(--k-external)"];
const plus = (xs: number[]) => (xs.length ? xs.join(" + ") : "nothing");
const coinsWord = (k: number) => `${k} ${k === 1 ? "coin" : "coins"}`;
/**
 * Wide (desktop pane): coin rack and trays on the left, the map of every amount (10 per row) on the right.
 * Narrow (phones): a narrower rack and trays, with the map under them.
 */
const WIDE = { W: 620, trayW: 404, trayX: 108, rackDx: 50, mapX: 446, pitch: 17.5, cell: 16, wide: true };
const NARROW = { W: 320, trayW: 312, trayX: 92, rackDx: 36, mapX: 30, pitch: 28.6, cell: 26, wide: false };
type Lay = typeof WIDE;

function Coin({ value, color, r = 15 }: { value: number; color: string; r?: number }) {
  return (
    <g>
      <circle r={r} fill={`color-mix(in srgb, ${color} 26%, var(--card))`} stroke={color} strokeWidth={2.2} />
      <circle r={r - 4} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6} />
      <text y={4.5} textAnchor="middle" style={{ fontSize: value >= 10 ? 12.5 : 13.5, fontWeight: 800 }}>
        {value}
      </text>
    </g>
  );
}

type TrayRow = { key: string; label: string; picks: number[]; shown: number; note: string; hidden?: boolean };

// ---------------------------------------------------------------- widget
export function GreedyLab() {
  const [text, setText] = useState("4, 3, 1");
  const [amount, setAmount] = useState(6);
  const [mode, setMode] = useState<"race" | "you">("race");
  const [mine, setMine] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [noTrap, setNoTrap] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const L: Lay = useNarrow(ref, 480) ? NARROW : WIDE;

  const parsed = parseCoins(text);
  const coins = parsed.length ? parsed : [1];
  const preset = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((k) => PRESETS[k].join() === coins.join()) ?? "custom";
  const greedy = greedyChange(coins, amount);
  const best = bestChange(coins, amount);
  const map = failures(coins);
  const v = verdict(coins, amount);
  const steps = Math.max(greedy.picks.length, best?.length ?? 0);

  const tick = useCallback((k: number) => Math.min(k + 1, steps), [steps]);
  const [k, setK] = useFixedStep<number>(0, tick, running && inView && !reduce && mode === "race", 650);
  const done = k >= steps;
  const you = mode === "you";
  const paid = sum(mine);
  const youDone = paid === amount;
  const fits = coins.filter((c) => c <= amount - paid);

  const restart = (opts: { amount?: number; coins?: string } = {}) => {
    if (opts.amount !== undefined) setAmount(opts.amount);
    if (opts.coins !== undefined) setText(opts.coins);
    setMine([]);
    setK(0);
    setNoTrap(false);
    setRunning(!reduce && mode === "race" && (opts.amount !== undefined || opts.coins !== undefined));
  };

  const color = (c: number) => PALETTE[Math.max(0, coins.indexOf(c)) % PALETTE.length];
  const rackX = (c: number) => L.trayX + 18 + coins.indexOf(c) * L.rackDx;
  const gLeft = amount - sum(greedy.picks.slice(0, k));
  const pointer = !you && k < greedy.picks.length ? greedy.picks[k] : null;
  const reveal = you ? (youDone ? 99 : 0) : k;

  const rows: TrayRow[] = [
    ...(you ? [{ key: "you", label: "You", picks: mine, shown: mine.length, note: youDone ? coinsWord(mine.length) : `${amount - paid} left` }] : []),
    {
      key: "greedy",
      label: "Greedy",
      picks: greedy.picks,
      shown: Math.min(reveal, greedy.picks.length),
      note: reveal >= greedy.picks.length || done ? (greedy.left ? `stuck, ${greedy.left} left` : coinsWord(greedy.picks.length)) : `${gLeft} left`,
      hidden: you && !youDone,
    },
    {
      key: "best",
      label: "Best (DP)",
      picks: best ?? [],
      shown: Math.min(reveal, best?.length ?? 0),
      note: best ? (reveal >= best.length ? coinsWord(best.length) : "…") : "impossible",
      hidden: you && !youDone,
    },
  ];
  const traysEnd = RACK_Y + 30 + rows.length * TRAY_H;
  const mapY = L.wide ? 50 : traysEnd + 30;
  const H = L.wide ? Math.max(traysEnd, mapY + 4 * L.pitch + 4) : mapY + 4 * L.pitch + 2;
  const traps = map.filter((x) => x === "worse" || x === "stuck").length;

  let sentence: string;
  const total = `the best is ${best ? `${coinsWord(best.length)} (${plus(best)})` : "impossible"}`;
  if (you) {
    if (!mine.length) sentence = `Your turn: pay ${amount} with as few coins as you can. Then compare with greedy and DP.`;
    else if (!youDone)
      sentence = fits.length ? `You've paid ${paid} with ${coinsWord(mine.length)}. ${amount - paid} left.` : `Stuck: no coin fits the ${amount - paid} left. Undo and try another way.`;
    else {
      const g = greedy.left ? "Greedy gets stuck" : `Greedy needs ${greedy.picks.length}`;
      const beat = best && mine.length === best.length ? (greedy.left || greedy.picks.length > best.length ? "You beat greedy." : "You matched the best.") : "There's a shorter way.";
      sentence = `You used ${coinsWord(mine.length)}. ${g}; ${total}. ${beat}`;
    }
  } else if (k === 0) sentence = `Pay ${amount} with coins ${coins.join(", ")}. Press Step: greedy grabs the biggest coin that fits; DP has already checked every smaller amount.`;
  else if (!done)
    sentence = k <= greedy.picks.length ? `Greedy takes ${greedy.picks[k - 1]}, the biggest coin that fits ${gLeft + greedy.picks[k - 1]}. ${gLeft} left.` : `Greedy is finished; DP keeps paying.`;
  else if (v === "same") sentence = `Both use ${coinsWord(greedy.picks.length)} (${plus(greedy.picks)}): greedy is optimal for ${amount}.`;
  else if (v === "worse") sentence = `Greedy needs ${coinsWord(greedy.picks.length)} (${plus(greedy.picks)}), but ${total}. The early big coin left a remainder only small coins could fill.`;
  else if (v === "stuck") sentence = `Greedy is stuck with ${greedy.left} left: no coin fits. DP still pays: ${total}.`;
  else sentence = `No combination of ${coins.join(", ")} makes ${amount}.`;
  if (noTrap) sentence = `No trap: with ${coins.join(", ")}, greedy is optimal for every amount from 1 to ${MAX_AMOUNT}. Try 4 3 1, or type your own coins.`;
  const said = useThrottled(sentence, 600);

  const label = `Pay ${amount} with coins ${coins.join(", ")}. ${rows.map((r) => `${r.label}: ${r.hidden ? "hidden" : `${plus(r.picks.slice(0, r.shown))}, ${r.note}`}`).join(". ")}. Greedy uses more coins than needed at ${traps} of ${MAX_AMOUNT} amounts${traps ? `, first at ${firstTrap(coins)}` : ""}.`;

  return (
    <WidgetFrame title="Greedy change: does the biggest coin win?" sub="Greedy grabs the largest coin that fits and never looks back. Race it against DP, or pay yourself, and hunt for the amounts where greedy loses.">
      <div className="controls">
        <Seg<"race" | "you">
          labelMode="hidden"
          label="Mode"
          value={mode}
          onChange={(x) => {
            setMode(x);
            setMine([]);
            setK(0);
            setRunning(false);
          }}
          options={[
            { value: "race", label: "Greedy vs DP" },
            { value: "you", label: "You pay" },
          ]}
        />
        {you ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Pay with a coin">
            {coins.map((c) => (
              <button key={c} type="button" className="wbtn" disabled={youDone || c > amount - paid} onClick={() => setMine([...mine, c])}>
                + {c}
              </button>
            ))}
            <button type="button" className="wbtn" disabled={!mine.length} onClick={() => setMine(mine.slice(0, -1))} aria-label="Undo the last coin">
              <Undo2 size={14} aria-hidden /> Undo
            </button>
          </div>
        ) : (
          <SimButtons
            running={running && !done}
            reduce={reduce}
            onToggle={() => {
              if (done) setK(0);
              setRunning((r) => !r || done);
            }}
            onStep={() => setK(tick(k))}
            stepHint="Drop the next coin into each tray"
            onReset={() => restart()}
          />
        )}
        <button
          type="button"
          className="wbtn"
          onClick={() => {
            const t = firstTrap(coins);
            if (t === null) setNoTrap(true);
            else restart({ amount: t });
          }}
          title="Jump to the smallest amount where greedy loses"
        >
          <Search size={14} aria-hidden /> Find a trap
        </button>
      </div>
      {parsed.length === 0 && (
        <p className="warn-ink" style={{ fontSize: 13, margin: "0 0 6px" }}>
          ⚠ No coins from 1 to {MAX_COIN} found in that text, so using a 1 coin.
        </p>
      )}

      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${H}`} className="sim-svg" role="img" aria-label={label} style={{ maxWidth: L.wide ? 680 : 480, margin: "0 auto" }}>
          <text x={10} y={RACK_Y + 5} style={{ fontSize: 14, fontWeight: 750 }}>
            Pay {amount}
          </text>
          {coins.map((c) => (
            <g key={c} transform={`translate(${rackX(c)} ${RACK_Y})`}>
              <Coin value={c} color={color(c)} />
            </g>
          ))}
          {pointer !== null && (
            <m.text
              initial={false}
              animate={{ x: rackX(pointer) }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              y={RACK_Y - 20}
              textAnchor="middle"
              style={{ fontSize: 11.5, fontWeight: 700, fill: "var(--accent)" }}
            >
              ▼ greedy
            </m.text>
          )}
          {rows.map((row, ri) => {
            const y = RACK_Y + 30 + ri * TRAY_H;
            const gap = Math.min(34, (L.trayW - L.trayX - 36) / Math.max(1, row.picks.length - 1));
            return (
              <g key={row.key}>
                <rect x={4} y={y} width={L.trayW - 4} height={TRAY_H - 8} rx={10} fill="var(--card-2)" stroke="var(--border)" />
                <text x={14} y={y + 21} style={{ fontSize: 14, fontWeight: 750 }}>
                  {row.label}
                </text>
                <text
                  x={14}
                  y={y + 39}
                  className={row.note.startsWith("stuck") || row.note === "impossible" ? undefined : "muted-text"}
                  style={{ fontSize: 12.5, fontWeight: 650, fill: row.note.startsWith("stuck") ? "var(--critical-ink)" : undefined }}
                >
                  {row.hidden ? "pay first" : row.note}
                </text>
                <AnimatePresence initial={false}>
                  {!row.hidden &&
                    row.picks.slice(0, row.shown).map((c, i) => (
                      <m.g
                        key={`${row.key}-${i}-${c}`}
                        initial={reduce ? false : { x: rackX(c), y: RACK_Y, opacity: 0.4 }}
                        animate={{ x: L.trayX + 18 + i * gap, y: y + TRAY_H / 2 - 4, opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.2 } }}
                        transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
                      >
                        <Coin value={c} color={color(c)} />
                      </m.g>
                    ))}
                </AnimatePresence>
              </g>
            );
          })}

          {/* every amount 1–40, ten per row: click one to pay it */}
          {L.wide && <line x1={L.trayW + 12} x2={L.trayW + 12} y1={8} y2={H - 8} stroke="var(--border)" />}
          <text x={L.mapX - 18} y={mapY - (L.wide ? 30 : 12)} className="muted-text" style={{ fontSize: 12.5 }}>
            {L.wide ? `Every amount 1–${MAX_AMOUNT}` : `Every amount 1–${MAX_AMOUNT}: ✕ greedy loses · ! stuck`}
          </text>
          {L.wide && (
            <text x={L.mapX - 18} y={mapY - 13} className="muted-text" style={{ fontSize: 11.5 }}>
              ✕ greedy loses · ! stuck · – none
            </text>
          )}
          {[0, 1, 2, 3].map((r) => (
            <text key={r} x={L.mapX - 4} y={mapY + r * L.pitch + L.cell / 2 + 4} textAnchor="end" className="muted-text" style={{ fontSize: L.wide ? 10 : 11 }}>
              {r * 10 + 1}
            </text>
          ))}
          {map.map((x, i) => {
            const a = i + 1;
            const cx = L.mapX + (i % 10) * L.pitch;
            const cy = mapY + Math.floor(i / 10) * L.pitch;
            const bad = x === "worse" || x === "stuck";
            return (
              <g key={a} onClick={() => restart({ amount: a })} style={{ cursor: "pointer" }}>
                <rect
                  x={cx}
                  y={cy}
                  width={L.cell}
                  height={L.cell}
                  rx={4}
                  fill={bad ? "color-mix(in srgb, var(--critical) 22%, var(--card))" : "var(--card-2)"}
                  stroke={a === amount ? "var(--accent)" : "var(--border)"}
                  strokeWidth={a === amount ? 2.5 : 1}
                />
                <text x={cx + L.cell / 2} y={cy + L.cell / 2 + 4} textAnchor="middle" style={{ fontSize: a === amount ? (L.wide ? 10.5 : 11.5) : L.wide ? 10.5 : 12, fontWeight: 800, fill: bad ? "var(--critical-ink)" : "var(--muted)" }}>
                  {a === amount ? a : x === "worse" ? "✕" : x === "stuck" ? "!" : x === "none" ? "–" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", fontVariantNumeric: "tabular-nums" }}>
        Greedy: <b>{greedy.picks.length}</b> picks, one pass · DP: <b>{amount}</b> × <b>{coins.length}</b> = <b>{amount * coins.length}</b> checks · greedy loses at <b>{traps}</b> of {MAX_AMOUNT}{" "}
        amounts
      </p>
      <p className="readout" aria-live="polite">
        {said}
        <ReducedNote reduce={reduce && !you} what="Reduced motion: no auto-play; Step drops one coin at a time." />
      </p>
      <More label="Coins and amount">
        <div className="controls">
          <Seg<string>
            label="Coins"
            value={preset}
            onChange={(p) => p !== "custom" && restart({ coins: PRESETS[p as keyof typeof PRESETS].join(", ") })}
            options={[
              { value: "us", label: "25 10 5 1" },
              { value: "trap", label: "4 3 1" },
              { value: "seven", label: "10 7 1" },
              ...(preset === "custom" ? [{ value: "custom", label: "Custom" }] : []),
            ]}
          />
          <label className="control" style={{ flex: "1 1 120px", minWidth: 120 }}>
            <span>Or type your own</span>
            <input type="text" value={text} onChange={(e) => restart({ coins: e.target.value })} />
          </label>
          <Slider label="Amount" value={amount} min={1} max={MAX_AMOUNT} onChange={(a) => restart({ amount: a })} />
        </div>
      </More>
    </WidgetFrame>
  );
}
