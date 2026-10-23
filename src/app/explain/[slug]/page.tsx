import { notFound } from "next/navigation";
import { getQuestion, questions } from "@content/registry";
import { getExtras } from "@content/extras";
import { ExplainClient } from "./client";

export const dynamicParams = false;

export function generateStaticParams() {
  return questions.filter((q) => getExtras("questions", q.slug)?.explain).map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/explain/[slug]">) {
  const q = getQuestion((await params).slug);
  return q ? { title: `Explain it back: ${q.title}`, description: `Rehearse ${q.title} the way you would in the interview: five steps, then check yourself.`, robots: { index: false } } : {};
}

export default async function ExplainPage({ params }: PageProps<"/explain/[slug]">) {
  const q = getQuestion((await params).slug);
  const extras = q && getExtras("questions", q.slug);
  if (!q || !extras?.explain) notFound();
  return <ExplainClient slug={q.slug} title={q.title} minutes={q.minutes} explain={extras.explain} say={extras.sayIt} />;
}
