import Link from "next/link";
import GithubSlugger from "github-slugger";
import { glossary } from "@content/glossary";

export const metadata = { title: "Glossary", description: "System design terms, one line each." };

export default function GlossaryPage() {
  const slugger = new GithubSlugger();
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <header className="page-head">
        <span className="eyebrow">Reference</span>
        <h1>Glossary</h1>
        <p className="lede">{terms.length} terms, one line each, with a link to where they&apos;re taught.</p>
      </header>
      <dl className="card" style={{ margin: 0 }}>
        {terms.map((t) => (
          <div key={t.term} id={slugger.slug(t.term)} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", scrollMarginTop: 80 }}>
            <dt style={{ fontWeight: 650 }}>{t.term}</dt>
            <dd style={{ margin: "2px 0 0", color: "var(--muted)" }}>
              {t.def}{" "}
              {t.href && (
                <Link href={t.href} className="link">
                  Learn →
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
