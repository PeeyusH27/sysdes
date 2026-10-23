"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { TRACK_LABEL, type Catalog, type Track } from "@/lib/prep/catalog-types";
import { band, readiness, type Skill } from "@/lib/prep/readiness";
import { useSignals } from "@/lib/prep/use-signals";

/** One round's readiness: a score, and a tile for every skill that makes it up. Click a tile to see why and what next. */
export function Readiness({ catalog, tracks }: { catalog: Catalog; tracks: Track[] }) {
  const signals = useSignals();
  const r = useMemo(() => readiness(catalog, signals), [catalog, signals]);
  const [picked, setPicked] = useState<string | null>(null);
  const all = tracks.flatMap((t) => r[t].skills);
  const sel = all.find((k) => k.id === picked) ?? null;

  return (
    <div className="rd" id="readiness">
      {tracks.map((t) => {
        const tr = r[t];
        const groups = [...new Set(tr.skills.map((k) => k.group))];
        return (
          <section key={t} className="rd-track" data-track={t === "dsa" ? "dsa" : "sd"} aria-labelledby={`rd-${t}`}>
            <header className="rd-head">
              <h3 id={`rd-${t}`}>{TRACK_LABEL[t]}</h3>
              <span className="rd-total">
                <b>{tr.score}%</b> {tr.band}
              </span>
              <span className="rd-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tr.score} aria-label={`${TRACK_LABEL[t]} readiness`}>
                <span style={{ width: `${tr.score}%` }} />
              </span>
              <span className="muted rd-count">
                {tr.ready} of {tr.skills.length} skills interview-ready
              </span>
            </header>
            {groups.map((g) => (
              <div key={g} className="rd-group">
                <p className="rd-group-name">{g}</p>
                <ul className="rd-tiles">
                  {tr.skills
                    .filter((k) => k.group === g)
                    .map((k) => (
                      <li key={k.id}>
                        <button type="button" className="rd-tile" style={{ "--score": k.score } as React.CSSProperties} aria-pressed={picked === k.id} onClick={() => setPicked(picked === k.id ? null : k.id)} aria-label={`${k.title}: ${k.score}%`}>
                          <span className="rd-name">{k.short}</span>
                          <span className="rd-score">{k.score}%</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
      {sel && <SkillDetail skill={sel} onClose={() => setPicked(null)} />}
    </div>
  );
}

function SkillDetail({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  return (
    <aside className="rd-detail card" aria-live="polite">
      <div className="rd-detail-head">
        <h4>
          {skill.title} <span className="muted">· {skill.score}% · {band(skill.score)}</span>
        </h4>
        <button type="button" className="wbtn" onClick={onClose}>
          Close
        </button>
      </div>
      <ul className="rd-evidence">
        {skill.evidence.map((e) => {
          const ok = e.got >= e.of;
          return (
            <li key={e.label} data-ok={ok || undefined}>
              <span className="rd-check">{ok ? <Check size={13} aria-hidden /> : null}</span>
              <span>{e.label}</span>
              <span className="muted">{e.of === 100 ? `${e.got}%` : `${e.got} of ${e.of}`}</span>
            </li>
          );
        })}
      </ul>
      {skill.next ? (
        <Link href={skill.next.href} className="btn btn-primary btn-sm">
          {skill.next.label} · {skill.next.minutes} min <ArrowRight size={14} aria-hidden />
        </Link>
      ) : (
        <p className="ok-ink" style={{ margin: 0 }}>
          <b>Interview-ready.</b> Come back for a refresher before the interview.
        </p>
      )}
      <Link href={skill.href} className="link rd-open">
        Open {skill.short}
      </Link>
    </aside>
  );
}

