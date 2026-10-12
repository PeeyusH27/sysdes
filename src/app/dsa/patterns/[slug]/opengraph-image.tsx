import { getPattern, patterns } from "@content/dsa/registry";
import { ogCard, ogSize } from "@/lib/og";

export const alt = "DSA & System Design";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return patterns.map((x) => ({ slug: x.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPattern((await params).slug);
  return ogCard({ eyebrow: p ? `DSA pattern ${p.order} · ${p.group}` : "DSA pattern", title: p?.title ?? "DSA patterns", summary: p?.summary, motif: "dsa" });
}
