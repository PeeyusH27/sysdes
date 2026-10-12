import { BookOpen, Code2, MessageSquare, Sparkles } from "lucide-react";
import { SectionDone, SectionTick } from "@/components/layout/Reader";

const KINDS = {
  read: { label: "Read", Icon: BookOpen },
  visual: { label: "Interactive", Icon: Sparkles },
  code: { label: "Code", Icon: Code2 },
  practice: { label: "Practice", Icon: MessageSquare },
} as const;

/**
 * One `##` section of an MDX page as a card. Emitted by src/lib/mdx/rehype-section-cards.mjs (never written by hand),
 * so every prop arrives as a string. The h2 is the first child.
 */
export function LessonSection({ index, id, title, minutes, kind, children }: { index: string; id: string; title: string; minutes: string; kind: string; children: React.ReactNode }) {
  const k = KINDS[kind as keyof typeof KINDS] ?? KINDS.read;
  return (
    <section className="sec-card" data-sec={id} data-title={title} data-kind={kind}>
      <div className="sec-head">
        <span className="sec-n" aria-hidden>
          {index.padStart(2, "0")}
        </span>
        <span className="sec-kind">
          <k.Icon size={13} aria-hidden /> {k.label} · {minutes} min
        </span>
        <SectionTick id={id} />
      </div>
      {children}
      <SectionDone id={id} />
    </section>
  );
}
