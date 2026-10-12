import { deepDives, getDeepDive } from "@content/registry";
import { ogCard, ogSize } from "@/lib/og";

export const alt = "DSA & System Design";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return deepDives.map((x) => ({ slug: x.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const q = getDeepDive((await params).slug);
  return ogCard({ eyebrow: "Deep dive", title: q?.title ?? "System Design Suite", summary: q?.summary });
}
