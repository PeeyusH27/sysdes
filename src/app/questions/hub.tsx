"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";
import { questions, type Category, type Level } from "@content/registry";
import { isLowLevel } from "@content/home";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";

const CATS: ("All" | Category)[] = ["All", "Frontend", "Backend", "Full-stack"];
const LEVELS: ("Any" | Level)[] = ["Any", "Easy", "Medium", "Hard"];

export function QuestionHub() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const done = useProgress((s) => s.done);
  const bookmarks = useProgress((s) => s.bookmarks);
  const challenge = useProgress((s) => s.challenge);

  const cat = (params.get("cat") ?? "All") as (typeof CATS)[number];
  const lv = (params.get("lv") ?? "Any") as (typeof LEVELS)[number];
  const term = params.get("q") ?? "";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const shown = questions.filter(
    (q) =>
      (cat === "All" || q.category === cat) &&
      (lv === "Any" || q.level === lv) &&
      `${q.title} ${q.summary} ${q.tags.join(" ")}`.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <>
      <div className="filters">
        <div className="chip-row" role="group" aria-label="Category">
          {CATS.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={c === cat} onClick={() => set("cat", c === "All" ? null : c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="Level">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={l === lv} onClick={() => set("lv", l === "Any" ? null : l)}>
              {l}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Search, e.g. redis, websockets…" defaultValue={term} aria-label="Search questions" onChange={(e) => set("q", e.target.value || null)} />
      </div>
      <p className="hub-count" aria-live="polite">
        {shown.length} question{shown.length === 1 ? "" : "s"}
      </p>
      <div className="grid-auto hub-cards">
        {shown.map((q) => {
          const href = `/questions/${q.slug}`;
          return (
            <Link key={q.slug} href={href} className="card card-link q-card">
              <div className="row">
                <span className={`badge badge-${q.category}`}>{q.category}</span>
                {isLowLevel(q) && <span className="badge badge-lld">LLD</span>}
                <span className="badge badge-level">{q.level}</span>
                <span className="muted" style={{ fontSize: 13 }}>{q.minutes} min</span>
                {hydrated && done[href] && (
                  <span className="badge badge-done">
                    <CheckCircle2 size={11} aria-hidden /> Solved
                  </span>
                )}
                {hydrated && bookmarks.includes(href) && <Star size={14} aria-label="Bookmarked" className="warn-ink" />}
                {hydrated && q.challenge && challenge[q.challenge] !== undefined && <span className="tag">Challenge {challenge[q.challenge]}%</span>}
              </div>
              <h2 className="tc-title">{q.title}</h2>
              <p>{q.summary}</p>
              <div className="tags">
                {q.tags.slice(0, 4).map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </Link>
          );
        })}
        {shown.length === 0 && (
          <div className="card hub-empty">
            No questions match.{" "}
            <button type="button" className="link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={() => router.replace(pathname)}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
