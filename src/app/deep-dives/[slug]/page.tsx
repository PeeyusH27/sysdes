import { notFound } from "next/navigation";
import { deepDives, getDeepDive } from "@content/registry";
import { DocLayout } from "@/components/layout/DocLayout";
import { boundComponents } from "@/components/content/bound";
import { getHeadings } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return deepDives.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/deep-dives/[slug]">) {
  const dd = getDeepDive((await params).slug);
  return dd ? { title: dd.title, description: dd.summary, alternates: { canonical: `/deep-dives/${dd.slug}` } } : {};
}

export default async function DeepDivePage({ params }: PageProps<"/deep-dives/[slug]">) {
  const dd = getDeepDive((await params).slug);
  if (!dd) notFound();
  const { default: Body } = await import(`@content/deep-dives/${dd.dir}/page.mdx`);
  const i = deepDives.indexOf(dd);
  const prev = deepDives[i - 1];
  const next = deepDives[i + 1];
  return (
    <DocLayout
      sideTitle="Deep dives"
      side={deepDives.map((d) => ({ href: `/deep-dives/${d.slug}`, label: d.short }))}
      eyebrow={`Deep dive ${dd.order} · ${dd.minutes} min`}
      title={dd.title}
      lede={dd.summary}
      headings={await getHeadings(`deep-dives/${dd.dir}/page.mdx`)}
      prev={prev && { href: `/deep-dives/${prev.slug}`, title: prev.title }}
      next={next && { href: `/deep-dives/${next.slug}`, title: next.title }}
      nextNote={dd.next}
    >
      <Body components={boundComponents(`deep-dives/${dd.dir}`)} />
    </DocLayout>
  );
}
