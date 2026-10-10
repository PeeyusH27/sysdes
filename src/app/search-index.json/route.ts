import { allPages } from "@content/registry";
import { mdxToPlainText } from "@/lib/content";

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
  return Response.json(docs);
}
