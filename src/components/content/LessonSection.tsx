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
 * so every prop arrives as a string. The children are already arranged by the plugin:
 *   layout="split"  one or more `div.sec-row`, each a `div.sec-body` (the h2 and the words) and a `div.sec-stage`
 *                   (diagrams, widgets, code, inside a `div.sec-fit`).
 *   layout="single" a `div.sec-body`, plus a `div.sec-stage` after it when the section is only visuals.
 * The DOM order is always text first, then its stage, so reading order and phones stay simple. From ~1080 px the
 * stages are shown one at a time in the pinned pane on the left (src/components/layout/StagePane.tsx).
 */
export function LessonSection({
  index,
  id,
  title,
  minutes,
  kind,
  layout = "single",
  children,
}: {
  index: string;
  id: string;
  title: string;
  minutes: string;
  kind: string;
  layout?: string;
  children: React.ReactNode;
}) {
  const k = KINDS[kind as keyof typeof KINDS] ?? KINDS.read;
  return (
    <section className="sec-card" data-sec={id} data-title={title} data-kind={kind} data-layout={layout === "split" ? "split" : "single"}>
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
