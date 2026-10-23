"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Shuffle, Timer } from "lucide-react";
import { TRACKS, type Catalog, type Track } from "@/lib/prep/catalog-types";
import { MOCK_BLURB, MOCK_LABEL, MOCK_MINUTES, mockScore, pickMock } from "@/lib/prep/mock";
import { useMock } from "@/lib/prep/mock-store";
import { useSignals } from "@/lib/prep/use-signals";
import { useHydrated } from "@/lib/hooks";

export function MockClient({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const signals = useSignals();
  const { active, history, start, abandon } = useMock();
  const asked = params.get("type");
  const [type, setType] = useState<Track>(TRACKS.includes(asked as Track) ? (asked as Track) : "dsa");
  const [minutes, setMinutes] = useState<number>(45);
  const [seed, setSeed] = useState(() => Date.now() & 0xffff);
  const items = useMemo(() => pickMock(type, catalog, signals, seed), [type, catalog, signals, seed]);

  if (!hydrated) return <p className="container muted">Loading…</p>;

  const begin = () => {
    if (!items.length) return;
    start(type, items, minutes * 60_000);
    router.push(items[0].href);
  };

  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">Prepare · Mock rounds</p>
        <h1>
          Rehearse it, <span className="grad">against the clock</span>
        </h1>
        <p className="lede">The round picks problems from where you are weakest and holds back hints and solutions until the time is up. Afterwards you get a debrief: what you solved, how fast, and what to review.</p>
      </header>

      {active && (
        <div className="pl-warn card" role="status">
          <p>
            <b>A round is in progress:</b> {MOCK_LABEL[active.type]}.
          </p>
          <div className="pl-actions">
            <Link href={active.items[0].href} className="btn btn-primary btn-sm">
              Resume the round
            </Link>
            <button type="button" className="btn btn-sm" onClick={abandon}>
              Abandon it
            </button>
          </div>
        </div>
      )}

      <fieldset className="mk-types">
        <legend className="sr-only">Round type</legend>
        {TRACKS.map((t) => (
          <label key={t} className="mk-type card" data-on={type === t || undefined}>
            <input type="radio" name="round" checked={type === t} onChange={() => setType(t)} />
            <b>{MOCK_LABEL[t]}</b>
            <span className="muted">{MOCK_BLURB[t]}</span>
          </label>
        ))}
      </fieldset>

      <div className="mk-setup card">
        <div className="mk-setup-head">
          <h3>Your round</h3>
          <label className="pl-field mk-length">
            <span>Length</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {MOCK_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="wbtn" onClick={() => setSeed((x) => x + 1)}>
            <Shuffle size={13} aria-hidden /> Different questions
          </button>
        </div>
        {items.length === 0 ? (
          <p className="muted">There is nothing to ask for this round yet.</p>
        ) : (
          <ol className="mk-items">
            {items.map((i) => (
              <li key={i.slug}>
                <b>{i.title}</b>
                <span className="muted">{i.why}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="muted mk-rules">
          <Timer size={13} aria-hidden /> {minutes} minutes. Hints and the solution are locked until you finish or the timer ends. Think out loud, as you would with an interviewer.
        </p>
        <button type="button" className="btn btn-primary" onClick={begin} disabled={!items.length || !!active}>
          Start the {MOCK_LABEL[type].toLowerCase()} <ArrowRight size={15} aria-hidden />
        </button>
      </div>

      {history.length > 0 && (
        <>
          <h2 className="section-title">Past rounds</h2>
          <ul className="plist">
            {history.map((h) => (
              <li key={h.id}>
                <div className="plist-row mk-hist">
                  <span className="plist-title">{MOCK_LABEL[h.type]}</span>
                  <span className="plist-summary">
                    {new Date(h.startedAt).toLocaleString()} · {h.outcomes.filter((o) => o.solved).length} of {h.outcomes.length} solved{h.timedOut ? " · ran out of time" : ""}
                  </span>
                  <b>{mockScore(h)}%</b>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
