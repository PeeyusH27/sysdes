import { notFound } from "next/navigation";
import { getChallenge } from "@/components/playground/challenges";
import { getMission, missions } from "@/components/playground/missions";
import { PlaygroundClient } from "../../client";

export const dynamicParams = false;

export function generateStaticParams() {
  return missions.map((m) => ({ challenge: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/playground/[challenge]/guided">) {
  const c = getChallenge((await params).challenge);
  return c ? { title: `Guided mission: ${c.title}`, description: `${c.brief} A step-by-step mission: one scenario at a time, with a coach.` } : {};
}

export default async function GuidedPage({ params }: PageProps<"/playground/[challenge]/guided">) {
  const slug = (await params).challenge;
  const c = getChallenge(slug);
  if (!c || !getMission(slug)) notFound();
  return <PlaygroundClient challenge={c.slug} guided />;
}
