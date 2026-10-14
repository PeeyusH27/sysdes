import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageActions, ReadingProgress } from "./PageChrome";
import { PageDrawer, PageDrawerButton } from "./PageDrawer";
import { DeckNav, Reader, ReaderBar } from "./Reader";
import { StagePane } from "./StagePane";

export interface DocNavItem {
  href: string;
  label: string;
}

/** Without JS there is no pane to show the visuals in, so they stay under their text in one column. */
const NO_JS = `@media (min-width:1080px){.doc-cols{display:block!important}.pane{display:none!important}.reader .sec-stage{display:block!important;margin-top:1.4em}}`;

/**
 * The frame of every detail page (learn lessons, deep dives, questions, DSA patterns): a full-width hero, the sticky
 * reader bar, then the section cards. The page list ("Questions", "HLD path"…) lives in a drawer opened from the reader
 * bar, and the bar's section menu lists the sections.
 * From ~1080 px the body is two columns: on the left one pinned pane (StagePane) that shows the diagrams, simulators
 * and code for the text being read, fitted to the viewport; on the right all the words, scrolling. Below that each
 * section's visuals follow its text (src/app/reader.css).
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
            <StagePane />
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
      <noscript dangerouslySetInnerHTML={{ __html: `<style>${NO_JS}</style>` }} />
    </div>
  );
}
