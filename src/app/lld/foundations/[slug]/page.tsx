import { notFound } from "next/navigation";
import { getLldLesson, lldLessons } from "@content/lld/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { LessonExercises } from "@/components/dsa/LessonExercises";
import { getHeadings } from "@/lib/content";
import { getExtras } from "@content/extras";
import { loadExercises } from "@/lib/dsa/load";

export const dynamicParams = false;

export function generateStaticParams() {
  return lldLessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lld/foundations/[slug]">) {
  const l = getLldLesson((await params).slug);
  return l ? { title: l.title, description: l.summary, alternates: { canonical: `/lld/foundations/${l.slug}` } } : {};
}

export default async function LldLessonPage({ params }: PageProps<"/lld/foundations/[slug]">) {
  const l = getLldLesson((await params).slug);
  if (!l) notFound();
  const { default: Body } = await import(`@content/lld/foundations/${l.dir}/page.mdx`);
  const i = lldLessons.indexOf(l);
  const prev = lldLessons[i - 1];
  const next = lldLessons[i + 1];
  const hasExercises = loadExercises().some((e) => e.meta.patterns.includes(l.slug));
  return (
    <DocLayout
      sideTitle="LLD foundations"
      side={lldLessons.map((x) => ({ href: `/lld/foundations/${x.slug}`, label: x.short }))}
      eyebrow={`Foundation ${l.order} of ${lldLessons.length} · ${l.minutes} min`}
      title={l.title}
      lede={l.summary}
      meta={l.outcomes.map((o) => (
        <span key={o} className="tag">
          ✓ {o}
        </span>
      ))}
      headings={[...(await getHeadings(`lld/foundations/${l.dir}/page.mdx`)), ...(hasExercises ? [{ depth: 2 as const, text: "Code it yourself", id: "code-it-yourself" }] : [])]}
      prev={prev && { href: `/lld/foundations/${prev.slug}`, title: prev.title }}
      next={next && { href: `/lld/foundations/${next.slug}`, title: next.title }}
      nextNote={l.next}
      extras={getExtras("lld", l.slug)}
    >
      <Body components={boundComponents(`lld/foundations/${l.dir}`)} />
      <LessonExercises lesson={l.slug} />
    </DocLayout>
  );
}
