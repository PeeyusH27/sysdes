"use client";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Doodle } from "@/components/doodle/Doodle";
import { CONCEPTS } from "@/lib/arch/concepts";
import type { ArchNodeId } from "@/lib/arch/design";

/** What you learn when you click a component: what it is, why you add it, when not to, trade-offs and the interview line. */
export function ConceptCard({ id, onClose }: { id: ArchNodeId; onClose: () => void }) {
  const c = CONCEPTS[id];
  if (!c) return null;
  return (
    <article className="concept" aria-label={c.name}>
      <header className="concept-head">
        {c.doodle && <Doodle name={c.doodle} size={96} />}
        <div>
          <p className="eyebrow">Component</p>
          <h3>{c.name}</h3>
          <p className="concept-eg">{c.examples.join(" · ")}</p>
        </div>
        <button type="button" className="icon-btn concept-close" aria-label="Close" onClick={onClose}>
          <X size={16} aria-hidden />
        </button>
      </header>
      <dl className="concept-list">
        <dt>What it is</dt>
        <dd>{c.what}</dd>
        <dt>Why you add it</dt>
        <dd>{c.why}</dd>
        <dt>When not to</dt>
        <dd>{c.whenNot}</dd>
      </dl>
      <h4>Trade-offs</h4>
      <ul className="concept-trade">
        {c.tradeoffs.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="concept-say">
        <span className="eyebrow">Say it</span>
        &ldquo;{c.say}&rdquo;
      </p>
      <p className="concept-follow">
        <span className="eyebrow">They will ask</span>
        {c.followUp}
      </p>
      <ul className="concept-learn">
        {c.learn.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="link">
              {l.label} <ArrowRight size={13} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
