import Link from "next/link";
import { PageActions, ReadingProgress, SideList } from "./PageChrome";

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
    <div className="container container-wide">
      <ReadingProgress />
      <div className="lesson">
        <SideList title={sideTitle} items={side} />
        <article className="lesson-main">
          <header className="page-head" style={{ paddingTop: 24 }}>
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            {lede && <p className="lede">{lede}</p>}
            {meta && <div className="meta-row">{meta}</div>}
            <PageActions />
          </header>
          <div className="prose">{children}</div>
          {nextNote && <p className="next-note">Next: {nextNote}</p>}
          <nav className="prev-next" aria-label="Previous and next">
            {prev ? (
              <Link className="card card-link" href={prev.href}>
                <small>← Previous</small>
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link className="card card-link next" href={next.href}>
                <small>Next →</small>
                {next.title}
              </Link>
            )}
          </nav>
        </article>
        <aside className="toc" aria-label="On this page">
          {headings.length > 0 && (
            <>
              <h2>On this page</h2>
              <ul>
                {headings
                  .filter((h) => h.depth === 2)
                  .map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
