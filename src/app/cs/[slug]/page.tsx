import { notFound } from "next/navigation";
import { csLessons, getCsLesson } from "@content/cs/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { getHeadings } from "@/lib/content";
import { getExtras } from "@content/extras";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return csLessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props) {
  const l = getCsLesson((await params).slug);
  return l ? { title: l.title, description: l.summary, alternates: { canonical: `/cs/${l.slug}` } } : {};
}

export default async function CsLessonPage({ params }: Props) {
  const l = getCsLesson((await params).slug);
  if (!l) notFound();
  const { default: Body } = await import(`@content/cs/lessons/${l.dir}/page.mdx`);
  const i = csLessons.indexOf(l);
  const prev = csLessons[i - 1];
  const next = csLessons[i + 1];
  return (
    <DocLayout
      sideTitle="CS fundamentals"
      side={csLessons.map((x) => ({ href: `/cs/${x.slug}`, label: x.short }))}
      eyebrow={`${l.group} · Lesson ${l.order} of ${csLessons.length} · ${l.minutes} min`}
      title={l.title}
      lede={l.summary}
      meta={l.outcomes.map((o) => (
        <span key={o} className="tag">
          ✓ {o}
        </span>
      ))}
      headings={await getHeadings(`cs/lessons/${l.dir}/page.mdx`)}
      prev={prev && { href: `/cs/${prev.slug}`, title: prev.title }}
      next={next && { href: `/cs/${next.slug}`, title: next.title }}
      nextNote={l.next}
      extras={getExtras("cs", l.slug)}
    >
      <Body components={boundComponents(`cs/lessons/${l.dir}`)} />
    </DocLayout>
  );
}
