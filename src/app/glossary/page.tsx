import Link from "next/link";
import GithubSlugger from "github-slugger";
import { ArrowRight, Zap } from "lucide-react";
import { glossary } from "@content/glossary";

export const metadata = { title: "Glossary", description: "System design terms and building blocks, one line each, with a one-minute short for most." };

export default function GlossaryPage() {
  const slugger = new GithubSlugger();
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  const withShorts = terms.filter((t) => t.short).length;
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Reference</span>
        <h1>Glossary</h1>
        <p className="lede">
          {terms.length} terms, one line each. Follow a link to where a term is taught, or open its one-minute short ({withShorts} have one).
        </p>
      </header>
      <dl className="glossary-grid">
        {terms.map((t) => (
          <div key={t.term} id={slugger.slug(t.term)} className="glossary-term">
            <dt>{t.term}</dt>
            <dd>{t.def}</dd>
            {(t.href || t.short) && (
              <dd className="glossary-links">
                {t.short && (
                  <Link href={`/shorts?s=${t.short}`} className="glossary-short">
                    <Zap size={13} aria-hidden /> 1-min short
                  </Link>
                )}
                {t.href && (
                  <Link href={t.href} className="link">
                    Learn <ArrowRight size={13} aria-hidden />
                  </Link>
                )}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
