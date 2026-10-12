"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useHydrated } from "@/lib/hooks";
import { useDsa } from "@/lib/dsa/store";
import type { ProblemRow } from "@/lib/dsa/load";
import { SolvedTick } from "./SolvedTick";

const LEVELS = ["Any", "Easy", "Medium", "Hard"] as const;
const STATUS = ["All", "Unsolved", "Solved"] as const;

export function ProblemList({ rows, patterns }: { rows: ProblemRow[]; patterns: { slug: string; title: string; short: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const solved = useDsa((s) => s.solved);

  const pat = params.get("p") ?? "";
  const lv = (params.get("lv") ?? "Any") as (typeof LEVELS)[number];
  const st = (params.get("st") ?? "All") as (typeof STATUS)[number];
  const term = (params.get("q") ?? "").toLowerCase();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isSolved = (slug: string) => hydrated && !!solved[slug];
  const shown = rows.filter(
    (r) =>
      (!pat || r.patterns.includes(pat)) &&
      (lv === "Any" || r.difficulty === lv) &&
      (st === "All" || (st === "Solved" ? isSolved(r.slug) : !isSolved(r.slug))) &&
      `${r.title} ${r.summary} ${r.patterns.join(" ")}`.toLowerCase().includes(term),
  );
  const groups = patterns
    .map((p) => ({ ...p, items: shown.filter((r) => (pat ? r.patterns.includes(p.slug) && p.slug === pat : r.patterns[0] === p.slug)) }))
    .filter((g) => g.items.length);

  const titleOf = new Map(patterns.map((p) => [p.slug, p.short]));
  const total = rows.length;
  const done = rows.filter((r) => isSolved(r.slug)).length;
  const by = (d: string) => {
    const all = rows.filter((r) => r.difficulty === d);
    return { all: all.length, done: all.filter((r) => isSolved(r.slug)).length };
  };

  return (
    <>
      <div className="dsa-progress" aria-live="polite">
        <div className="dsa-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Problems solved">
          <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <span>
          <strong>{done}</strong> of {total} solved
        </span>
        {(["Easy", "Medium", "Hard"] as const).map((d) => {
          const c = by(d);
          return (
            <span key={d} className={`diff diff-${d}`}>
              {d} {c.done}/{c.all}
            </span>
          );
        })}
      </div>

      <div className="filters">
        <label className="pattern-select">
          <span className="sr-only">Pattern</span>
          <select value={pat} onChange={(e) => set("p", e.target.value || null)}>
            <option value="">All patterns</option>
            {patterns.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <div className="chip-row" role="group" aria-label="Difficulty">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={l === lv} onClick={() => set("lv", l === "Any" ? null : l)}>
              {l}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="Status">
          {STATUS.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={s === st} onClick={() => set("st", s === "All" ? null : s)}>
              {s}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search problems, e.g. anagram, interval…" defaultValue={params.get("q") ?? ""} aria-label="Search problems" onChange={(e) => set("q", e.target.value || null)} />
      </div>
      <p className="muted" aria-live="polite" style={{ fontSize: 14 }}>
        {shown.length} problem{shown.length === 1 ? "" : "s"}
      </p>

      {groups.map((g) => (
        <section key={g.slug} className="plist-group" aria-labelledby={`pg-${g.slug}`}>
          <h2 id={`pg-${g.slug}`}>
            <Link href={`/dsa/patterns/${g.slug}`}>{g.title}</Link>
            <span className="muted">
              {g.items.filter((r) => isSolved(r.slug)).length}/{g.items.length}
            </span>
          </h2>
          <ul className="plist">
            {g.items.map((r) => (
              <li key={r.slug}>
                <Link href={`/dsa/problems/${r.slug}`} className="plist-row">
                  <SolvedTick slug={r.slug} />
                  <span className="plist-title">{r.title}</span>
                  <span className="plist-summary">{r.summary}</span>
                  <span className="plist-tags">
                    {r.patterns
                      .filter((s) => s !== g.slug)
                      .map((s) => (
                        <span key={s} className="tag">
                          {titleOf.get(s) ?? s}
                        </span>
                      ))}
                  </span>
                  <span className={`diff diff-${r.difficulty}`}>{r.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && (
        <div className="card">
          No problems match.{" "}
          <button type="button" className="link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => router.replace(pathname)}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
