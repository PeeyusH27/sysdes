import { notFound } from "next/navigation";
import { challenges, getChallenge } from "@/components/playground/challenges";
import { PlaygroundClient } from "../client";

export const dynamicParams = false;

export function generateStaticParams() {
  return challenges.map((c) => ({ challenge: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/playground/[challenge]">) {
  const c = getChallenge((await params).challenge);
  return c ? { title: `Challenge: ${c.title}`, description: c.brief } : {};
}

export default async function ChallengePage({ params }: PageProps<"/playground/[challenge]">) {
  const c = getChallenge((await params).challenge);
  if (!c) notFound();
  return <PlaygroundClient challenge={c.slug} />;
}
