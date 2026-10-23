import { allPages } from "@content/registry";
import { shorts } from "@content/shorts";
import { mdxToPlainText, readContent } from "@/lib/content";
import { loadExercises, loadProblems } from "@/lib/dsa/load";

export const dynamic = "force-static";

export async function GET() {
  const docs = await Promise.all(
    allPages().map(async (p) => ({
      id: p.href,
      title: p.title,
      section: p.section,
      summary: p.summary,
      tags: p.tags.join(" "),
      body: p.file ? (await mdxToPlainText(p.file)).slice(0, 8000) : "",
    })),
  );
  const problems = await Promise.all(
    loadProblems().map(async (p) => ({
      id: `/dsa/problems/${p.slug}`,
      title: p.meta.title,
      section: "Problems",
      summary: p.meta.summary,
      tags: [p.meta.difficulty, ...p.meta.patterns].join(" "),
      body: (await readContent(`dsa/problems/${p.slug}/statement.md`)).replace(/[`*_#>|]/g, " ").slice(0, 3000),
    })),
  );
  const exercises = await Promise.all(
    loadExercises().map(async (p) => ({
      id: `/lld/exercises/${p.slug}`,
      title: `${p.meta.title} (LLD exercise)`,
      section: "LLD",
      summary: p.meta.summary,
      tags: ["lld", "exercise", p.meta.difficulty, ...p.meta.patterns].join(" "),
      body: (await readContent(`lld/exercises/${p.slug}/statement.md`)).replace(/[`*_#>|]/g, " ").slice(0, 3000),
    })),
  );
  const shortDocs = shorts.map((s) => ({
    id: `/shorts?s=${s.id}`,
    title: s.title.replace(/[`*]/g, ""),
    section: "Shorts",
    summary: s.hook.replace(/[`*]/g, ""),
    tags: `${s.track} ${s.topic}`,
    body: [...s.points, ...s.more.flatMap((g) => g.points)].join(" ").replace(/[`*]/g, ""),
  }));
  return Response.json([...docs, ...problems, ...exercises, ...shortDocs]);
}
