import { getPattern } from "@content/dsa/registry";
import { loadProblem, loadProblems } from "@/lib/dsa/load";
import { ogCard, ogSize } from "@/lib/og";

export const alt = "DSA & System Design";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return loadProblems().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = loadProblem((await params).slug);
  const pattern = p && getPattern(p.meta.patterns[0]);
  return ogCard({ eyebrow: p ? `${p.meta.difficulty} · ${pattern?.short ?? "DSA"}` : "DSA problem", title: p?.meta.title ?? "DSA problem", summary: p?.meta.summary, motif: "dsa" });
}
