"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Timer } from "lucide-react";
import { TRACK_LABEL, TRACKS, type Catalog, type Track } from "@/lib/prep/catalog-types";
import { buildPlan, doNext, weeksLeft } from "@/lib/prep/plan";
import { readiness, weakest } from "@/lib/prep/readiness";
import { useSignals } from "@/lib/prep/use-signals";
import { useProgress } from "@/lib/progress";
import { useHydrated } from "@/lib/hooks";

const WEEKS = [1, 2, 3, 4, 6, 8, 12];
const HOURS = [3, 5, 8, 12, 20];
const KIND: Record<string, string> = { read: "Read", problem: "Solve", exercise: "Code", drill: "Drill", challenge: "Build", mission: "Mission", question: "Read", explain: "Explain", mock: "Mock round" };
const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

export function PlanView({ catalog }: { catalog: Catalog }) {
  const hydrated = useHydrated();
  const saved = useProgress((s) => s.plan);
  const setPlan = useProgress((s) => s.setPlan);
  const signals = useSignals();
  const [editing, setEditing] = useState(false);
  const [rounds, setRounds] = useState<Track[]>(["dsa", "hld", "lld"]);
  const [weeks, setWeeks] = useState(6);
  const [hours, setHours] = useState(8);
  const [showAll, setShowAll] = useState(false);

  const left = saved ? weeksLeft(saved.weeks, saved.startedAt) : 0;
  const plan = useMemo(() => (saved ? buildPlan(catalog, signals, { rounds: saved.rounds, weeks: left, hoursPerWeek: saved.hoursPerWeek }) : null), [catalog, signals, saved, left]);
  const next = plan ? doNext(plan) : null;
  const r = useMemo(() => readiness(catalog, signals), [catalog, signals]);

  if (!hydrated) return <p className="muted">Loading your plan…</p>;

  const toggle = (t: Track) => setRounds((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  if (!saved || editing) {
    return (
      <form
        className="pl-form card"
        onSubmit={(e) => {
          e.preventDefault();
          if (!rounds.length) return;
          setPlan({ rounds, weeks, hoursPerWeek: hours, startedAt: Date.now() });
          setEditing(false);
        }}
      >
        <h3>Build your plan</h3>
        <p className="muted">Three answers. The plan is rebuilt from your progress every time you open it, so finishing something moves everything up.</p>
        <fieldset>
          <legend>Which rounds are you preparing for?</legend>
          {TRACKS.map((t) => (
            <label key={t} className="pl-check">
              <input type="checkbox" checked={rounds.includes(t)} onChange={() => toggle(t)} /> {TRACK_LABEL[t]}
            </label>
          ))}
        </fieldset>
        <label className="pl-field">
          <span>How many weeks until the interview?</span>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {WEEKS.map((w) => (
              <option key={w} value={w}>
                {w} {w === 1 ? "week" : "weeks"}
              </option>
            ))}
          </select>
        </label>
        <label className="pl-field">
          <span>How many hours a week can you study?</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h} hours
              </option>
            ))}
          </select>
        </label>
        <div className="pl-actions">
          <button type="submit" className="btn btn-primary" disabled={!rounds.length}>
            Build my plan <ArrowRight size={15} aria-hidden />
          </button>
          {saved && (
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  }

  const weakAll = weakest(saved.rounds.flatMap((t) => r[t].skills), 3);
  const visible = showAll ? plan!.weeks : plan!.weeks.slice(0, 2);
  return (
    <div className="pl">
      <div className="pl-summary card">
        <p>
          <b>{left}</b> {left === 1 ? "week" : "weeks"} left · <b>{saved.hoursPerWeek} h</b> a week · {saved.rounds.map((t) => TRACK_LABEL[t]).join(", ")}
        </p>
        <button type="button" className="wbtn" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>

      {next && (
        <Link href={next.href} className="pl-next card card-link">
          <span className="eyebrow">Do this next</span>
          <span className="pl-next-title">{next.label}</span>
          <span className="muted">
            {KIND[next.kind]} · {next.minutes} min
          </span>
          <ArrowRight size={18} aria-hidden />
        </Link>
      )}

      {!plan!.fits && (
        <div className="pl-warn card" role="status">
          <p>
            <b>This does not all fit.</b> You have {hm(plan!.availableMinutes)} for work and about {hm(plan!.backlogMinutes)} is left to do. The plan below covers the most important first.
          </p>
          <p>
            To fit all of it in {left} {left === 1 ? "week" : "weeks"} you would need about <b>{plan!.hoursNeeded} hours</b> a week. Or drop a round, or ask for more time. {plan!.unscheduled.length} items are left out
            (the later ones in each round).
          </p>
        </div>
      )}

      <ol className="pl-weeks">
        {visible.map((w) => (
          <li key={w.n} className="pl-week card">
            <h4>
              Week {w.n}
              {w.n === plan!.weeks[0].n && !w.mock && <span className="pl-now">this week</span>}
              {w.mock && <span className="pl-now">mock rounds</span>}
              <span className="muted">{hm(w.minutes)}</span>
            </h4>
            <ul>
              {w.items.map((i) => (
                <li key={i.id}>
                  <Link href={i.href} className="pl-item">
                    <span className="pl-kind" data-kind={i.kind}>
                      {i.kind === "mock" && <Timer size={12} aria-hidden />} {i.label.startsWith("Finish the quiz") ? "Quiz" : KIND[i.kind]}
                    </span>
                    <span className="pl-label">{i.label.replace(/^(Read|Solve|Code|Build|Play the|Finish the quiz:|Explain) /, "")}</span>
                    <span className="muted pl-min">{i.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {plan!.weeks.length > 2 && (
        <button type="button" className="wbtn" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer weeks" : `Show all ${plan!.weeks.length} weeks`}
        </button>
      )}

      {weakAll.length > 0 && (
        <p className="muted pl-weak">
          Weakest right now:{" "}
          {weakAll.map((k, n) => (
            <span key={k.id}>
              {n > 0 && ", "}
              <Link href={k.next!.href} className="link">
                {k.short} ({k.score}%)
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
