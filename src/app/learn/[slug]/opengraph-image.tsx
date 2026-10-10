import { learnSteps, getLearnStep } from "@content/registry";
import { ogCard, ogSize } from "@/lib/og";

export const alt = "System Design Suite";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return learnSteps.map((x) => ({ slug: x.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const q = getLearnStep((await params).slug);
  return ogCard({ eyebrow: "HLD path", title: q?.title ?? "System Design Suite", summary: q?.summary });
}
