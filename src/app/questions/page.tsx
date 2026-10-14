import { Suspense } from "react";
import { questions } from "@content/registry";
import { isLowLevel } from "@content/home";
import { HubTabs } from "@/components/content/HubBits";
import { QuestionHub } from "./hub";

export const metadata = { title: "Interview questions", description: "Famous frontend, backend and full-stack system design questions with detailed answers." };

export default function QuestionsPage() {
  const lld = questions.filter(isLowLevel).length;
  return (
    <div className="container hub" data-track="sd">
      <header className="page-head hub-head">
        <p className="eyebrow">System design · Interview questions</p>
        <h1>
          Interview questions, <span className="grad">answered in full</span>
        </h1>
        <p className="lede">
          {questions.length} classics, from a parking lot to Uber. Each answer walks the whole interview: requirements, numbers, API, data model, an animated
          architecture, code and the follow-ups.
        </p>
        <ul className="hub-facts">
          <li>
            <b>{lld}</b> low-level design
          </li>
          <li>
            <b>{questions.length - lld}</b> high-level design
          </li>
          <li>
            <b>{questions.filter((q) => q.level === "Hard").length}</b> rated hard
          </li>
        </ul>
      </header>
      <HubTabs track="sd" />
      <Suspense fallback={<p className="muted">Loading filters…</p>}>
        <QuestionHub />
      </Suspense>
    </div>
  );
}
