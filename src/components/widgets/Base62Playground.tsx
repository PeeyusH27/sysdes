"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Minus, Plus, Server, Shuffle, Skull, Zap } from "lucide-react";
import { int } from "@/lib/format";
import { useFixedStep } from "@/lib/sim-loop";
import { draw } from "./lib/draw-rng";
import { ReducedNote, SimButtons, useSimGate, useThrottled } from "./lib/sim-kit";
import { Seg, Slider, WidgetFrame } from "./WidgetFrame";

/* ------------------------------------------------------------------ pure base62 + scramble (BigInt-safe) */

export const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** 62^7 = 3,521,614,606,208: every 7-character code. */
export const M = 62n ** 7n;
/** ≈ 0.618·M; odd and not a multiple of 31, so coprime with 62^7 = 2^7·31^7. */
export const P = 2_176_477_561_533n;

export function modInverse(a: bigint, mod: bigint) {
  let [r0, r1, s0, s1] = [a, mod, 1n, 0n];
  while (r1) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return ((s0 % mod) + mod) % mod;
}
export const P_INV = modInverse(P, M);

export function toBase62(n: bigint) {
  if (n < 0n) throw new RangeError("negative");
  let s = "";
  do {
    s = ALPHABET[Number(n % 62n)] + s;
    n /= 62n;
  } while (n > 0n);
  return s;
}
export function fromBase62(s: string) {
  let n = 0n;
  for (const ch of s) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) throw new RangeError(`not base62: ${ch}`);
    n = n * 62n + BigInt(d);
  }
  return n;
}
/** The long-division ladder that toBase62 walks: n, n mod 62, the character. */
export function base62Steps(n: bigint) {
  const out: { n: bigint; rem: number; char: string }[] = [];
  do {
    const rem = Number(n % 62n);
    out.push({ n, rem, char: ALPHABET[rem] });
    n /= 62n;
  } while (n > 0n);
  return out;
}
/** A bijection on [0, 62^7): unique 7-character codes that don't look sequential. Obfuscation, not security. */
export const scramble = (id: bigint) => (id * P) % M;
export const unscramble = (x: bigint) => (x * P_INV) % M;
export const shortCode = (id: bigint) => toBase62(scramble(id)).padStart(7, "0");

/** Digits only (commas and spaces ignored), up to 30 digits. */
export function parseId(text: string): bigint | null {
  const clean = text.replace(/[\s,_]/g, "");
  if (!/^\d{1,30}$/.test(clean)) return null;
  return BigInt(clean);
}

/* ------------------------------------------------------------------ pure range allocator */

export interface AllocServer {
  name: string;
  start: number;
  end: number;
  next: number;
  issued: number;
  last: { id: number; code: string }[];
}
export interface AllocCall {
  n: number;
  server: number;
  top: number;
}
export interface AllocState {
  counter: number;
  block: number;
  servers: AllocServer[];
  calls: AllocCall[];
  callCount: number;
  wasted: number;
  links: number;
  seed: number;
  message: string;
}

const NAMES = ["A", "B", "C", "D", "E"];

export const initAlloc = (servers: number, block: number, seed = 21): AllocState => ({
  counter: 0,
  block,
  servers: Array.from({ length: servers }, (_, i) => ({ name: NAMES[i], start: 0, end: 0, next: 0, issued: 0, last: [] })),
  calls: [],
  callCount: 0,
  wasted: 0,
  links: 0,
  seed,
  message: `Every server starts with an empty block. Its first link triggers INCRBY url:id ${block}.`,
});

/** Issue the next id on server `i`; refills its block with one atomic INCRBY when it runs out. */
export function nextId(s: AllocState, i: number): AllocState {
  const servers = s.servers.map((x) => ({ ...x }));
  const srv = servers[i];
  let { counter, calls, callCount } = s;
  let refill = "";
  if (srv.next >= srv.end) {
    counter += s.block; // INCRBY returns the new top of the block
    callCount += 1;
    srv.start = counter - s.block;
    srv.end = counter;
    srv.next = srv.start;
    calls = [...calls, { n: callCount, server: i, top: counter }].slice(-8);
    refill = `Server ${srv.name} ran out and called INCRBY url:id ${int(s.block)} → ${int(counter)}: it now owns ids ${int(srv.start)}–${int(srv.end - 1)}. `;
  }
  const id = srv.next++;
  const code = shortCode(BigInt(id));
  srv.issued++;
  srv.last = [{ id, code }, ...srv.last].slice(0, 3);
  return { ...s, counter, servers, calls, callCount, links: s.links + 1, message: `${refill}Server ${srv.name} issued id ${int(id)} → /${code}.` };
}

/** Pick a server with the seeded RNG and issue one id there. */
export function nextIdRandom(s: AllocState): AllocState {
  const [r, seed] = draw(s.seed);
  return nextId({ ...s, seed }, Math.floor(r * s.servers.length));
}

/** A crash loses the unused rest of the server's block: ids only need to be unique, not contiguous. */
export function crash(s: AllocState, i: number): AllocState {
  const srv = s.servers[i];
  const lost = Math.max(0, srv.end - srv.next);
  const servers = s.servers.map((x, k) => (k === i ? { ...x, start: 0, end: 0, next: 0, last: [] } : x));
  return { ...s, servers, wasted: s.wasted + lost, message: `Server ${srv.name} crashed and restarted: ${int(lost)} unused ids from its block are skipped forever. No duplicates are possible.` };
}

/* ------------------------------------------------------------------ view */

const SAMPLE_IDS = [1n, 2n, 3n];

function Encoder() {
  const [text, setText] = useState("125");
  const id = parseId(text);
  const steps = id !== null ? base62Steps(id) : [];
  const plain = id !== null ? toBase62(id) : "";
  const inRange = id !== null && id < M;
  const scr = id !== null && inRange ? scramble(id) : null;
  const code = id !== null && inRange ? shortCode(id) : "";
  const bump = (d: bigint) => {
    const v = (id ?? 0n) + d;
    setText((v < 0n ? 0n : v).toString());
  };

  return (
    <div>
      <div className="controls" style={{ marginBottom: 6 }}>
        <label className="control" style={{ maxWidth: 240 }}>
          <span>Numeric id (any size)</span>
          <input type="text" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={id === null} spellCheck={false} />
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="wbtn" onClick={() => bump(-1n)} aria-label="Previous id">
            <Minus size={14} aria-hidden />
          </button>
          <button type="button" className="wbtn" onClick={() => bump(1n)} aria-label="Next id">
            <Plus size={14} aria-hidden />
          </button>
          <button type="button" className="wbtn" onClick={() => setText("3521614606207")}>
            Largest 7-char
          </button>
        </div>
      </div>
      {id === null ? (
        <p className="readout bad-ink" aria-live="polite">
          Type a whole number (digits only).
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8 }}>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", background: "var(--card-2)", lineHeight: 1.45 }}>
              <div className="muted" style={{ fontSize: 12.5 }}>Plain base62 (divide by 62, read remainders bottom-up)</div>
              <table style={{ fontSize: 12.5, lineHeight: 1.35, fontVariantNumeric: "tabular-nums", borderCollapse: "collapse", margin: "2px 0", width: "100%" }}>
                <thead>
                  <tr className="muted" style={{ textAlign: "left" }}>
                    <th style={{ fontWeight: 500 }}>n</th>
                    <th style={{ fontWeight: 500 }}>n mod 62</th>
                    <th style={{ fontWeight: 500 }}>char</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.slice(0, 8).map((st, i) => (
                    <tr key={i}>
                      <td style={{ wordBreak: "break-all", paddingRight: 8 }}>{st.n.toLocaleString("en")}</td>
                      <td>{st.rem}</td>
                      <td>
                        <code>{st.char}</code>
                      </td>
                    </tr>
                  ))}
                  {steps.length > 8 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        … {steps.length - 8} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ fontWeight: 650, overflowWrap: "anywhere" }}>
                → <code style={{ fontSize: 15 }}>{plain}</code> <span className="muted" style={{ fontWeight: 400 }}>({plain.length} chars, decodes back to {fromBase62(plain).toLocaleString("en")})</span>
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", background: "var(--card-2)", lineHeight: 1.45 }}>
              <div className="muted" style={{ fontSize: 12.5 }}>Scrambled short code: id × P mod 62⁷, padded to 7</div>
              {inRange ? (
                <>
                  <p style={{ margin: "6px 0", fontSize: 12.5, lineHeight: 1.45, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
                    {id.toLocaleString("en")} × {P.toLocaleString("en")} mod {M.toLocaleString("en")} = <strong>{scr!.toLocaleString("en")}</strong>
                  </p>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
                    <code>/{code}</code>
                  </div>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                    Unscramble: {scr!.toLocaleString("en")} × P⁻¹ mod 62⁷ = {unscramble(scr!).toLocaleString("en")} ✓
                  </p>
                </>
              ) : (
                <p className="warn-ink" style={{ fontSize: 13 }}>
                  Beyond 62⁷ − 1 ({M.toLocaleString("en")} codes): 7 characters are used up. Switch to 8-character codes (and a scramble over 62⁸).
                </p>
              )}
            </div>
          </div>
          <p className="readout" aria-live="polite">
            Id {id.toLocaleString("en")} is <code>{plain}</code> in base62{inRange ? <>, or <code>{code}</code> after scrambling</> : ""}. Sequential ids give guessable plain codes ({SAMPLE_IDS.map((x) => toBase62(x).padStart(7, "0")).join(", ")}) but scrambled ones look random ({SAMPLE_IDS.map((x) => shortCode(x)).join(", ")}). It&apos;s a bijection, so codes never collide, but it is obfuscation, not security.
          </p>
        </>
      )}
    </div>
  );
}

/** True when the widget is phone-narrow; false on the server and until measured, so the first render matches desktop. */
function useNarrow(ref: React.RefObject<HTMLElement | null>, px = 480) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setNarrow(e.contentRect.width < px); // 0 = hidden: keep the last layout
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}

/** Where each piece goes: one row of servers under Redis (landscape), or rows of three on a phone. */
function allocLayout(n: number, narrow: boolean) {
  const W = narrow ? 300 : 600;
  const bw = narrow ? 92 : 104;
  const bh = narrow ? 86 : 76;
  const top = 86;
  const cols = narrow ? Math.min(3, n) : n;
  const pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const gap = narrow ? 100 : Math.min(140, (W - 40) / Math.max(1, n));
    return { x: W / 2 + ((i % cols) - (inRow - 1) / 2) * gap, y: top + r * (bh + 12) };
  });
  return { W, bw, bh, pos, rx: W / 2, ry: 28, H: top + Math.ceil(n / cols) * (bh + 12) - 8 };
}

function Allocator() {
  const [servers, setServers] = useState(3);
  const [block, setBlock] = useState(1000);
  const [running, setRunning] = useState(false);
  const { ref, inView, reduce } = useSimGate<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(box);
  // auto traffic: ~6 links/s on random servers
  const step = useCallback((s: AllocState) => {
    const [r, seed] = draw(s.seed);
    return r < 0.3 ? nextIdRandom({ ...s, seed }) : { ...s, seed };
  }, []);
  const [s, reset] = useFixedStep<AllocState>(() => initAlloc(3, 1000), step, running && inView && !reduce);
  const said = useThrottled(s.message, 700);

  const restart = (n: number, b: number) => reset(initAlloc(n, b));
  const bulk = (k: number) => {
    let x = s;
    for (let i = 0; i < k; i++) x = nextIdRandom(x);
    reset({ ...x, message: `Created ${k} links. ${x.message}` });
  };
  const fullest = s.servers.reduce((best, x, i) => (x.end - x.next > s.servers[best].end - s.servers[best].next ? i : best), 0);
  const L = allocLayout(s.servers.length, narrow);

  return (
    <div ref={box}>
      <div className="controls">
        <Slider label="App servers" value={servers} min={2} max={5} onChange={(v) => { setServers(v); restart(v, block); }} />
        <Seg<number>
          label="Block size"
          value={block}
          onChange={(v) => { setBlock(v); restart(servers, v); }}
          options={[
            { value: 10, label: "10" },
            { value: 100, label: "100" },
            { value: 1000, label: "1,000" },
          ]}
        />
        <button type="button" className="wbtn primary" onClick={() => reset(nextIdRandom(s))}>
          <Shuffle size={14} aria-hidden /> Create<span className="b62-long"> a link</span>
        </button>
        <button type="button" className="wbtn" onClick={() => bulk(block === 10 ? 25 : 250)}>
          <Zap size={14} aria-hidden /> +{block === 10 ? 25 : 250} links
        </button>
        <button type="button" className="wbtn danger" onClick={() => reset(crash(s, fullest))}>
          <Skull size={14} aria-hidden /> Crash <span className="b62-long">server </span>
          {s.servers[fullest].name}
        </button>
        <SimButtons
          running={running && inView}
          reduce={reduce}
          onToggle={() => setRunning((r) => !r)}
          onStep={() => reset(nextIdRandom(s))}
          stepHint="Create one link on a random server"
          onReset={() => restart(servers, block)}
        />
      </div>
      <div ref={ref}>
        <svg viewBox={`0 0 ${L.W} ${L.H}`} className="sim-svg" role="img" aria-label={`Redis counter url:id = ${s.counter}. ${s.servers.length} servers.`}>
          <rect x={L.rx - 90} y={L.ry - 24} width={180} height={48} rx={10} fill="var(--card-2)" stroke="var(--k-cache)" strokeWidth={1.8} />
          <text x={L.rx} y={L.ry - 5} textAnchor="middle" style={{ fontWeight: 700 }}>
            Redis · url:id
          </text>
          <text x={L.rx} y={L.ry + 14} textAnchor="middle" style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
            {int(s.counter)}
          </text>
          {s.servers.map((srv, i) => {
            const { x, y } = L.pos[i];
            const used = srv.end > srv.start ? (srv.next - srv.start) / (srv.end - srv.start) : 1;
            const half = L.bw / 2;
            return (
              <g key={srv.name}>
                <line x1={x} y1={y} x2={L.rx} y2={L.ry + 24} stroke="var(--border)" strokeWidth={1.2} />
                <rect x={x - half} y={y} width={L.bw} height={L.bh} rx={10} fill="var(--card-2)" stroke="var(--k-service)" strokeWidth={1.6} />
                <Server x={x - half + 6} y={y + 5} width={13} height={13} aria-hidden style={{ color: "var(--k-service)" }} />
                <text x={x + 6} y={y + 16} textAnchor="middle" style={{ fontWeight: 700 }}>
                  Server {srv.name}
                </text>
                <text x={x} y={y + 31} textAnchor="middle" style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>
                  {srv.end > 0 ? `[${int(srv.start)}, ${int(srv.end)})` : "no block yet"}
                </text>
                <rect x={x - half + 10} y={y + 37} width={L.bw - 20} height={6} rx={3} fill="var(--border)" />
                <rect x={x - half + 10} y={y + 37} width={(L.bw - 20) * Math.min(1, used)} height={6} rx={3} fill={used >= 0.9 ? "var(--warning)" : "var(--series-1)"} />
                {narrow ? (
                  <>
                    <text x={x} y={y + 56} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                      next {srv.end > 0 ? int(srv.next) : "–"}
                    </text>
                    <text x={x} y={y + 69} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                      {srv.issued} links
                    </text>
                  </>
                ) : (
                  <text x={x} y={y + 56} textAnchor="middle" className="muted-text" style={{ fontSize: 10.5 }}>
                    next {srv.end > 0 ? int(srv.next) : "–"} · {srv.issued} links
                  </text>
                )}
                {srv.last[0] && (
                  <text x={x} y={y + L.bh - 7} textAnchor="middle" style={{ fontSize: 10.5, fontFamily: "var(--font-mono)" }}>
                    /{srv.last[0].code}
                  </text>
                )}
              </g>
            );
          })}
          {!reduce &&
            s.calls.map((c) => {
              if (c.server >= s.servers.length) return null;
              const { x, y } = L.pos[c.server];
              return (
                <g key={c.n}>
                  <m.circle
                    r={6}
                    fill="var(--series-2)"
                    stroke="var(--card)"
                    strokeWidth={2}
                    initial={{ cx: x, cy: y, opacity: 1 }}
                    animate={{ cx: [x, L.rx, x], cy: [y, L.ry + 24, y], opacity: [1, 1, 1, 0] }}
                    transition={{ duration: 1.1, ease: "easeInOut" }}
                  />
                  <m.text
                    x={(x + L.rx) / 2}
                    y={(y + L.ry + 24) / 2 - 6}
                    textAnchor="middle"
                    style={{ fontSize: 10.5, fontWeight: 700, paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 1.2, duration: 0.4 }}
                  >
                    INCRBY {int(s.block)} → {int(c.top)}
                  </m.text>
                </g>
              );
            })}
        </svg>
      </div>
      <p className="readout" aria-live="polite">
        {said} <span className="muted">Totals: {int(s.links)} links, {s.callCount} Redis calls ({s.callCount ? `1 per ${int(s.links / s.callCount)} links` : "none yet"}), {int(s.wasted)} ids skipped by crashes.</span>
        <ReducedNote reduce={reduce} what="Auto traffic is off (reduced motion): Step creates one link." />
      </p>
    </div>
  );
}

const CSS = `
.w-b62 { container-type: inline-size; }
@container (max-width: 420px) { .w-b62 .b62-long { display: none; } .w-b62 .controls { gap: 8px 10px; } }
`;

const PARTS = [
  { id: "encode", label: "1. Encode an id" },
  { id: "alloc", label: "2. Range allocator" },
] as const;

export function Base62Playground() {
  const [part, setPart] = useState<(typeof PARTS)[number]["id"]>("encode");
  return (
    <WidgetFrame title="Base62 codes and range allocation" sub="Turn an id into a short code, scramble it so neighbours don't look alike, and hand out ids without a hot counter.">
      <style href="w-base62" precedence="widgets">
        {CSS}
      </style>
      <div className="w-b62">
        <div className="seg" role="group" aria-label="Part of the playground" style={{ marginBottom: 8 }}>
          {PARTS.map((p) => (
            <button key={p.id} type="button" aria-pressed={part === p.id} onClick={() => setPart(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div hidden={part !== "encode"}>
          <Encoder />
        </div>
        <div hidden={part !== "alloc"}>
          <p className="muted" style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.45 }}>
            One Redis call per block: each server grabs a range with INCRBY, then serves it from memory.
          </p>
          <Allocator />
        </div>
      </div>
    </WidgetFrame>
  );
}
