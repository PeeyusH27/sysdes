import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { primers } from "@content/primers";
import { Doodle } from "@/components/doodle/Doodle";
import { HubTabs } from "@/components/content/HubBits";

export const metadata = {
  title: "The basics",
  description: "What is a cache? A load balancer? Sharding? Each core idea in about a minute: a picture, a short animation and three things to remember.",
  alternates: { canonical: "/basics" },
};

export default function BasicsPage() {
  const all = primers();
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · The basics</p>
        <h1>
          What is it, <span className="grad">in a minute?</span>
        </h1>
        <p className="lede">The ideas every design is built from: a picture, a short animation and three things to remember. Start here if a word was new to you.</p>
      </header>
      <HubTabs track="sd" />
      <ul className="basics-grid">
        {all.map((p) => (
          <li key={p.id}>
            <Link href={`/basics/${p.id}`} className="card card-link basics-card">
              <Doodle name={p.doodle} size={130} />
              <h2>{p.title}</h2>
              <p>{p.idea}</p>
              <span className="tc-go">
                See it in a minute <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
