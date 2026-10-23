import Link from "next/link";
import { notFound } from "next/navigation";
import { Braces } from "lucide-react";
import { getJsTopic, getPattern, patterns } from "@content/dsa/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { PatternProblems } from "@/components/dsa/PatternProblems";
import { PatternInSystems } from "@/components/content/Bridges";
import { systemsFor } from "@content/bridges";
import { getHeadings } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return patterns.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/patterns/[slug]">) {
  const p = getPattern((await params).slug);
  return p ? { title: `${p.title} pattern`, description: p.summary, alternates: { canonical: `/dsa/patterns/${p.slug}` } } : {};
}

export default async function PatternPage({ params }: PageProps<"/dsa/patterns/[slug]">) {
  const p = getPattern((await params).slug);
  if (!p) notFound();
  const { default: Body } = await import(`@content/dsa/patterns/${p.dir}/page.mdx`);
  const i = patterns.indexOf(p);
  const prev = patterns[i - 1];
  const next = patterns[i + 1];
  const headings = await getHeadings(`dsa/patterns/${p.dir}/page.mdx`);
  return (
    <DocLayout
      sideTitle="DSA patterns"
      side={patterns.map((x) => ({ href: `/dsa/patterns/${x.slug}`, label: x.short }))}
      eyebrow={`Pattern ${p.order} of ${patterns.length} · ${p.group} · ${p.minutes} min`}
      title={p.title}
      lede={p.summary}
      meta={
        <>
          <span className="js-ref-label">Spot it:</span>
          {p.signals.map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
          <span className="js-ref-row">
            <span className="js-ref-label">JavaScript you&apos;ll use:</span>
            {p.js.map((id) => (
              <Link key={id} href={`/dsa/js#${id}`} className="js-ref">
                <Braces size={12} aria-hidden /> {getJsTopic(id)?.title ?? id}
              </Link>
            ))}
          </span>
        </>
      }
      headings={[
        ...headings,
        { depth: 2 as const, text: "Practice problems", id: "practice-problems" },
        ...(systemsFor(p.slug).length ? [{ depth: 2 as const, text: "In real systems", id: "in-real-systems" }] : []),
      ]}
      prev={prev && { href: `/dsa/patterns/${prev.slug}`, title: prev.title }}
      next={next && { href: `/dsa/patterns/${next.slug}`, title: next.title }}
      nextNote={p.next}
    >
      <Body components={boundComponents(`dsa/patterns/${p.dir}`)} />
      <PatternProblems slug={p.slug} />
      <PatternInSystems slug={p.slug} />
    </DocLayout>
  );
}
