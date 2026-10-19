import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageActions, ReadingProgress } from "./PageChrome";
import { PageDrawer, PageDrawerButton } from "./PageDrawer";
import { DeckNav, Reader, ReaderBar, SectionRail } from "./Reader";

export interface DocNavItem {
  href: string;
  label: string;
}

/**
 * The frame of every detail page (learn lessons, deep dives, questions, DSA patterns): a compact hero, then two columns
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
  children: React.ReactNode;
}) {
  return (
    <div className="container container-doc">
      <ReadingProgress />
      <Reader>
        <article className="doc">
          <header className="page-head lesson-hero">
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            {lede && <p className="lede">{lede}</p>}
            {meta && <div className="meta-row">{meta}</div>}
            <PageActions />
          </header>
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
      </Reader>
    </div>
  );
}
