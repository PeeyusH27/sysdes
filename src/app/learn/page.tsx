import Link from "next/link";
import { learnSteps } from "@content/registry";
import { MetroMap } from "./metro";

export const metadata = { title: "HLD path", description: "Ten steps from requirements to case studies." };

export default function LearnIndex() {
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">The HLD path</span>
        <h1>
          High-level design, <span className="grad">one stop at a time</span>
        </h1>
        <p className="lede">
          {learnSteps.length} steps for MERN and Python developers. Each has animated flow diagrams you can step through, an interactive
          simulator, JavaScript code that runs, interview answers and a quiz.
        </p>
      </header>
      <MetroMap />
      <div className="grid-auto" style={{ marginTop: 18 }}>
        {learnSteps.map((s) => (
          <Link key={s.slug} href={`/learn/${s.slug}`} className="card card-link">
            <span className="eyebrow">
              Step {s.order} · {s.minutes} min
            </span>
            <h3 style={{ margin: "6px 0 6px", fontSize: 18 }}>{s.title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{s.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
