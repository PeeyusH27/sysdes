import { Suspense } from "react";
import { patterns } from "@content/dsa/registry";
import { problemRows } from "@/lib/dsa/load";
import { ProblemList } from "@/components/dsa/ProblemList";

export const metadata = {
  title: "DSA practice problems",
  description: "Solve DSA problems in JavaScript in the browser: run the tests, track what you've solved, and unlock a step-by-step solution when you get stuck.",
};

export default function ProblemsPage() {
  const rows = problemRows();
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">DSA · Practice</span>
        <h1>
          Solve it in the browser, <span className="grad">see what fails</span>
        </h1>
        <p className="lede">
          {rows.length} problems grouped by pattern. Write JavaScript in the editor, run the examples, then submit against every test. Solved problems are ticked
          automatically, and a step-by-step solution unlocks after your first wrong submission.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading problems…</p>}>
        <ProblemList rows={rows} patterns={patterns.map((p) => ({ slug: p.slug, title: p.title, short: p.short }))} />
      </Suspense>
    </div>
  );
}
