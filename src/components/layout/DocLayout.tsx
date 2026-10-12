import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageActions, ReadingProgress, SideList } from "./PageChrome";
import { DeckNav, Reader, ReaderBar, SectionMap } from "./Reader";

export interface DocNavItem {
  href: string;
  label: string;
}

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
  wide = false,
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
  /** Drop the right-hand "On this page" column so wide content (algorithm animations) gets the room. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="container container-wide">
      <ReadingProgress />
      <Reader>
        <div className={wide ? "lesson lesson--wide" : "lesson"}>
          <SideList title={sideTitle} items={side} />
          <article className="lesson-main">
            <header className="page-head lesson-hero">
              <div className="eyebrow">{eyebrow}</div>
              <h1>{title}</h1>
              {lede && <p className="lede">{lede}</p>}
              {meta && <div className="meta-row">{meta}</div>}
              <PageActions />
            </header>
            <ReaderBar />
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
          </article>
          <SectionMap headings={headings} hidden={wide} />
        </div>
      </Reader>
    </div>
  );
}
