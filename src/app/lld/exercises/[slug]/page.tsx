import { notFound } from "next/navigation";
import { getLldLesson } from "@content/lld/registry";
import { loadExercise, loadExercises, runnable } from "@/lib/dsa/load";
import { ProblemWorkspace } from "@/components/dsa/ProblemWorkspace";
import { SolutionView, Statement } from "@/components/dsa/ProblemParts";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadExercises().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lld/exercises/[slug]">) {
  const p = loadExercise((await params).slug);
  return p ? { title: `${p.meta.title} (LLD exercise)`, description: p.meta.summary, alternates: { canonical: `/lld/exercises/${p.slug}` } } : {};
}

export default async function ExercisePage({ params }: PageProps<"/lld/exercises/[slug]">) {
  const { slug } = await params;
  const p = loadExercise(slug);
  if (!p) notFound();
  const all = loadExercises();
  const i = all.indexOf(p);
  const prev = all[i - 1];
  const next = all[i + 1];
  return (
    <ProblemWorkspace
      track="lld"
      problem={runnable(p)}
      starter={p.starter}
      starterPy={p.starterPy}
      patterns={p.meta.patterns.flatMap((s) => {
        const l = getLldLesson(s);
        return l ? [{ slug: s, title: l.short }] : [];
      })}
      js={[]}
      statement={<Statement problem={p} />}
      solution={<SolutionView problem={p} />}
      position={{ index: i, total: all.length }}
      prev={prev && { slug: prev.slug, title: prev.meta.title }}
      next={next && { slug: next.slug, title: next.meta.title }}
    />
  );
}
