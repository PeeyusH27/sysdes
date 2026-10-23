import { patterns } from "@content/dsa/registry";
import { problemRows } from "@/lib/dsa/load";
import { PatternDrill } from "@/components/dsa/PatternDrill";
import { HubTabs } from "@/components/content/HubBits";

export const metadata = {
  title: "Pattern drill",
  description: "Read a problem, pick the pattern. Ten quick questions that train the hardest part of a coding interview: recognising which idea a problem is hiding.",
  alternates: { canonical: "/dsa/drill" },
};

export default function DrillPage() {
  const rows = problemRows().map((r) => ({ slug: r.slug, title: r.title, summary: r.summary, difficulty: r.difficulty, patterns: r.patterns }));
  return (
    <div className="container hub" data-track="dsa">
      <header className="page-head hub-head">
        <p className="eyebrow">DSA · Pattern drill</p>
        <h1>
          Which pattern is <span className="grad">hiding here?</span>
        </h1>
        <p className="lede">Knowing the patterns is half of it. Spotting which one a new problem is wearing is the other half.</p>
      </header>
      <HubTabs track="dsa" />
      <PatternDrill rows={rows} patterns={patterns.map((p) => ({ slug: p.slug, title: p.title, short: p.short, group: p.group, signals: p.signals }))} />
    </div>
  );
}
