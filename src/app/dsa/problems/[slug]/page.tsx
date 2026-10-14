import { notFound } from "next/navigation";
import { getJsTopic, getPattern } from "@content/dsa/registry";
import { loadProblem, loadProblems, runnable } from "@/lib/dsa/load";
import { ProblemWorkspace } from "@/components/dsa/ProblemWorkspace";
import { SolutionView, Statement } from "@/components/dsa/ProblemParts";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadProblems().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/problems/[slug]">) {
  const p = loadProblem((await params).slug);
  return p ? { title: `${p.meta.title} (${p.meta.difficulty})`, description: p.meta.summary, alternates: { canonical: `/dsa/problems/${p.slug}` } } : {};
}

export default async function ProblemPage({ params }: PageProps<"/dsa/problems/[slug]">) {
  const { slug } = await params;
  const p = loadProblem(slug);
  if (!p) notFound();
  const all = loadProblems();
  const i = all.indexOf(p);
  const prev = all[i - 1];
  const next = all[i + 1];
  return (
    <ProblemWorkspace
      problem={runnable(p)}
      starter={p.starter}
      starterPy={p.starterPy}
      patterns={p.meta.patterns.flatMap((s) => {
        const pat = getPattern(s);
        return pat ? [{ slug: s, title: pat.title }] : [];
      })}
      js={p.meta.js.flatMap((id) => {
        const t = getJsTopic(id);
        return t ? [{ id, title: t.title }] : [];
      })}
      statement={<Statement problem={p} />}
      solution={<SolutionView problem={p} />}
      position={{ index: i, total: all.length }}
      prev={prev && { slug: prev.slug, title: prev.meta.title }}
      next={next && { slug: next.slug, title: next.meta.title }}
    />
  );
}
