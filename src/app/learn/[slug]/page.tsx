import { notFound } from "next/navigation";
import { getLearnStep, learnSteps } from "@content/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { getHeadings } from "@/lib/content";
import { PatternsBehind } from "@/components/content/Bridges";
import { patternsFor } from "@content/bridges";
import { getExtras } from "@content/extras";

export const dynamicParams = false;

export function generateStaticParams() {
  return learnSteps.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">) {
  const step = getLearnStep((await params).slug);
  return step ? { title: step.title, description: step.summary, alternates: { canonical: `/learn/${step.slug}` } } : {};
}

export default async function LessonPage({ params }: PageProps<"/learn/[slug]">) {
  const step = getLearnStep((await params).slug);
  if (!step) notFound();
  const { default: Body } = await import(`@content/learn/${step.dir}/page.mdx`);
  const i = learnSteps.indexOf(step);
  const prev = learnSteps[i - 1];
  const next = learnSteps[i + 1];
  return (
    <DocLayout
      sideTitle="HLD path"
      side={learnSteps.map((s) => ({ href: `/learn/${s.slug}`, label: s.short }))}
      eyebrow={`Step ${step.order} of ${learnSteps.length} · ${step.minutes} min`}
      title={step.title}
      lede={step.summary}
      meta={step.outcomes.map((o) => (
        <span key={o} className="tag">
          ✓ {o}
        </span>
      ))}
      headings={[
        ...(await getHeadings(`learn/${step.dir}/page.mdx`)),
        ...(patternsFor(`/learn/${step.slug}`).length ? [{ depth: 2 as const, text: "Patterns behind this", id: "patterns-behind" }] : []),
      ]}
      prev={prev && { href: `/learn/${prev.slug}`, title: prev.title }}
      next={next && { href: `/learn/${next.slug}`, title: next.title }}
      nextNote={step.next}
      extras={getExtras("learn", step.slug)}
    >
      <Body components={boundComponents(`learn/${step.dir}`)} />
      <PatternsBehind href={`/learn/${step.slug}`} />
    </DocLayout>
  );
}
