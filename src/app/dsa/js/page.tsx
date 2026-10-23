import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { JS_GROUPS, jsTopics, patterns } from "@content/dsa/registry";
import { boundComponents } from "@/components/content/bound";
import { ReadingProgress } from "@/components/layout/PageChrome";
import { PrintButton } from "@/app/cheatsheet/print";

export const metadata = {
  title: "JavaScript for DSA cheat sheet",
  description: "Every JavaScript feature you need to solve coding interview problems: arrays, strings, Map and Set, sorting, recursion, heaps, bitwise operators and the gotchas that fail hidden tests.",
};

async function TopicBody({ file }: { file: string }) {
  if (!existsSync(path.join(process.cwd(), "content", "dsa", "js", `${file}.mdx`))) {
    return <p className="coming-soon">This topic is being written.</p>;
  }
  const { default: Body } = await import(`@content/dsa/js/${file}.mdx`);
  return <Body components={boundComponents("dsa/js")} />;
}

export default function JsCheatsheet() {
  return (
    <div className="container container-wide">
      <ReadingProgress />
      <div className="lesson js-sheet">
        <nav className="lesson-side" aria-label="Cheat sheet topics">
          {JS_GROUPS.map((g) => (
            <div key={g} className="js-side-group">
              <h2>{g}</h2>
              <ol>
                {jsTopics
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`}>{t.title}</a>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </nav>
        <article className="lesson-main">
          <header className="page-head" style={{ paddingTop: 24 }}>
            <span className="eyebrow">DSA · Step 0</span>
            <h1>JavaScript for DSA</h1>
            <p className="lede">
              The parts of JavaScript you actually use in interviews, with the traps to avoid. Every snippet runs: press <strong>Run</strong>, or <strong>Edit</strong> to experiment.
            </p>
            <div className="meta-row no-print">
              <PrintButton />
              <Link href="/dsa/patterns" className="btn btn-sm">
                Next: the patterns →
              </Link>
            </div>
          </header>
          <div className="prose">
            {jsTopics.map((t) => {
              const usedBy = patterns.filter((p) => p.js.includes(t.id));
              return (
                <section key={t.id} id={t.id} className="js-topic" aria-labelledby={`${t.id}-h`}>
                  <h2 id={`${t.id}-h`}>
                    <a href={`#${t.id}`} className="anchor">
                      {t.title}
                    </a>
                  </h2>
                  <p className="js-topic-summary">{t.summary}</p>
                  <TopicBody file={t.file} />
                  {usedBy.length > 0 && (
                    <p className="js-used-by">
                      <span className="js-ref-label">Used in:</span>{" "}
                      {usedBy.map((p) => (
                        <Link key={p.slug} href={`/dsa/patterns/${p.slug}`} className="tag">
                          {p.title}
                        </Link>
                      ))}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}
