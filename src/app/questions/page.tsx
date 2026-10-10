import { Suspense } from "react";
import { questions } from "@content/registry";
import { QuestionHub } from "./hub";

export const metadata = { title: "Interview questions", description: "Famous frontend, backend and full-stack system design questions with detailed answers." };

export default function QuestionsPage() {
  return (
    <div className="container">
      <header className="page-head">
        <span className="eyebrow">Practice</span>
        <h1>
          Interview questions with <span className="grad">full answers</span>
        </h1>
        <p className="lede">
          {questions.length} famous questions across frontend, backend and full-stack. Each answer covers requirements, estimates, APIs, the data
          model, an animated architecture, step-by-step reasoning, complete JavaScript code, failure modes, trade-offs and answered follow-ups.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading filters…</p>}>
        <QuestionHub />
      </Suspense>
    </div>
  );
}
