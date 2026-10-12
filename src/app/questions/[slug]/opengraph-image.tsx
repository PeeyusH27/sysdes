import { questions, getQuestion } from "@content/registry";
import { ogCard, ogSize } from "@/lib/og";

export const alt = "DSA & System Design";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return questions.map((x) => ({ slug: x.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const q = getQuestion((await params).slug);
  return ogCard({ eyebrow: q ? `${q.category} · ${q.level}` : "", title: q?.title ?? "System Design Suite", summary: q?.summary });
}
