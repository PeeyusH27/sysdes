import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageActions, ReadingProgress } from "./PageChrome";
import { PageDrawer, PageDrawerButton } from "./PageDrawer";
import { DeckNav, Reader, ReaderBar, SectionRail } from "./Reader";
import { Doodle } from "@/components/doodle/Doodle";
import { SayItCard } from "@/components/content/SayIt";
import { ChecksProvider } from "@/components/content/CardCheck";
import { BasicsCard } from "@/components/content/BasicsCard";
import { PrimerCard } from "@/components/content/PrimerCard";
import { StoryShell } from "@/components/story/StoryShell";
import type { PageExtras } from "@content/extras";

export interface DocNavItem {
  href: string;
  label: string;
}

/**
 * The frame of every detail page (learn lessons, deep dives, questions, DSA patterns): a compact hero, an intro band
 * ("Start here" beside "Say it in 30 seconds"), then two columns
 * from 1080 px: a sticky outline of the sections on the left (SectionRail) and the lesson on the right, each section's
 * diagrams and code sitting right under its text. Below 1080 px the outline becomes the sticky reader bar. The page list
 * ("Questions", "HLD path"…) lives in a drawer opened from either (src/app/reader.css).
 */
export function DocLayout({
  side,
  sideTitle,
  eyebrow,
  title,
  lede,
  meta,
  headings,
  prev,
  next,
  nextNote,
  extras,
  children,
}: {
  side: DocNavItem[];
  sideTitle: string;
  eyebrow: React.ReactNode;
  title: string;
  lede?: string;
  meta?: React.ReactNode;
  headings: { depth: 2 | 3; text: string; id: string }[];
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
  nextNote?: string;
  /** Folded sections, the 30-second card and the doodle (content/extras). */
  extras?: PageExtras;
  children: React.ReactNode;
}) {
  const detail = (extras?.detail ?? []).filter((id) => /^[a-z0-9-]+$/.test(id));
  return (
    <div className="container container-doc">
      <ReadingProgress />
      {detail.length > 0 && (
        // Server-rendered, so a folded section never flashes before the reader's own state loads.
        <style>{`${detail.map((id) => `.reader[data-depth="core"] .sec-card[data-sec="${id}"]`).join(",")}{display:none}`}</style>
      )}
      <Reader detail={detail}>
        <ChecksProvider checks={extras?.checks}>
        <article className="doc" data-view={extras?.story ? "story" : undefined}>
          <header className="page-head lesson-hero">
            {extras?.doodle && (
              <div className="hero-doodle">
                <Doodle name={extras.doodle} size={150} />
              </div>
            )}
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            {lede && <p className="lede">{lede}</p>}
            {meta && <div className="meta-row">{meta}</div>}
            <PageActions />
          </header>
          {(extras?.basics || extras?.sayIt) && (
            // "Start here" and "Say it in 30 seconds" sit side by side from 1080 px, so the lesson starts higher up the page.
            <div className="doc-top" data-pair={extras.basics && extras.sayIt ? "" : undefined}>
              {extras.basics && <BasicsCard title={title} basics={extras.basics} />}
              {extras.sayIt && <SayItCard title={title} say={extras.sayIt} />}
            </div>
          )}
          {extras?.story && <StoryShell story={extras.story} say={extras.sayIt} title={title} />}
          {extras?.primer && <PrimerCard id={extras.primer} compact startClosed={!!extras.story} />}
          <ReaderBar lead={<PageDrawerButton title={sideTitle} items={side} />} headings={headings} />
          <div className="doc-cols">
            <SectionRail lead={<PageDrawerButton title={sideTitle} items={side} />} headings={headings} />
            <div className="lesson-main doc-main">
              <div className="prose">{children}</div>
              <DeckNav />
              {nextNote && <p className="next-note">Next: {nextNote}</p>}
              <nav className="prev-next" aria-label="Previous and next">
                {prev ? (
                  <Link className="card card-link" href={prev.href}>
                    <small>
                      <ArrowLeft size={13} aria-hidden /> Previous
                    </small>
                    {prev.title}
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link className="card card-link next" href={next.href}>
                    <small>
                      Next <ArrowRight size={13} aria-hidden />
                    </small>
                    {next.title}
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </article>
        <PageDrawer title={sideTitle} items={side} prev={prev} next={next} />
        </ChecksProvider>
      </Reader>
    </div>
  );
}
