import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPrimer, primers } from "@content/primers";
import { PrimerCard } from "@/components/content/PrimerCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return primers().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/basics/[id]">) {
  const p = getPrimer((await params).id);
  return p ? { title: p.title, description: p.idea, alternates: { canonical: `/basics/${p.id}` } } : {};
}

export default async function PrimerPage({ params }: PageProps<"/basics/[id]">) {
  const p = getPrimer((await params).id);
  if (!p) notFound();
  const all = primers();
  const i = all.findIndex((x) => x.id === p.id);
  const next = all[i + 1] ?? all[0];
  return (
    <div className="container primer-page" data-track="sd">
      <Link href="/basics" className="link primer-back">
        <ArrowLeft size={14} aria-hidden /> All the basics
      </Link>
      <h1>{p.title}</h1>
      <PrimerCard id={p.id} />
      <nav className="prev-next" aria-label="Next primer">
        <span />
        <Link className="card card-link next" href={`/basics/${next.id}`}>
          <small>Next</small>
          {next.title}
        </Link>
      </nav>
    </div>
  );
}
