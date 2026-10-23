import Link from "next/link";
import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { getQuestion, questions, allPages } from "@content/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { getHeadings } from "@/lib/content";
import { PatternsBehind } from "@/components/content/Bridges";
import { patternsFor } from "@content/bridges";

export const dynamicParams = false;

export function generateStaticParams() {
  return questions.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/questions/[slug]">) {
  const q = getQuestion((await params).slug);
  return q ? { title: q.title, description: q.summary, alternates: { canonical: `/questions/${q.slug}` } } : {};
}

export default async function QuestionPage({ params }: PageProps<"/questions/[slug]">) {
  const q = getQuestion((await params).slug);
  if (!q) notFound();
  const { default: Body } = await import(`@content/questions/${q.slug}/page.mdx`);
  const i = questions.indexOf(q);
  const prev = questions[i - 1];
  const next = questions[i + 1];
  const titleOf = (href: string) => allPages().find((p) => p.href === href)?.title ?? href;
  return (
    <DocLayout
      sideTitle="Questions"
      side={questions.map((x) => ({ href: `/questions/${x.slug}`, label: x.title.replace(/^(Design|Build) (an? )?/, "") }))}
      eyebrow={
        <span className="meta-row" style={{ margin: 0 }}>
          <span className={`badge badge-${q.category}`}>{q.category}</span>
          <span className="badge badge-level">{q.level}</span>
          <span>{q.minutes} min</span>
        </span>
      }
      title={q.title}
      lede={q.summary}
      meta={
        <>
          {q.related.length > 0 && <span>Related:</span>}
          {q.related.map((r) => (
            <Link key={r} href={r} className="tag">
              {titleOf(r)}
            </Link>
          ))}
          {q.challenge && (
            <Link href={`/playground/${q.challenge}`} className="btn btn-sm btn-primary">
              <Hammer size={14} aria-hidden /> Build it in the playground
            </Link>
          )}
        </>
      }
      headings={[
        ...(await getHeadings(`questions/${q.slug}/page.mdx`)),
        ...(patternsFor(`/questions/${q.slug}`).length ? [{ depth: 2 as const, text: "Patterns behind this", id: "patterns-behind" }] : []),
      ]}
      prev={prev && { href: `/questions/${prev.slug}`, title: prev.title }}
      next={next && { href: `/questions/${next.slug}`, title: next.title }}
    >
      <Body components={boundComponents(`questions/${q.slug}`)} />
      <PatternsBehind href={`/questions/${q.slug}`} />
    </DocLayout>
  );
}
