import Link from "next/link";
import { loadExercises } from "@/lib/dsa/load";
import { SolvedCount } from "./SolvedCount";
import { SolvedTick } from "./SolvedTick";

/** "Code it yourself" section at the end of an LLD lesson: the exercises that practise it. */
export function LessonExercises({ lesson }: { lesson: string }) {
  const items = loadExercises().filter((e) => e.meta.patterns.includes(lesson));
  if (!items.length) return null;
  return (
    <section className="pattern-problems" aria-labelledby="code-it-yourself">
      <h2 id="code-it-yourself">Code it yourself</h2>
      <p>
        Write the class in the browser editor, in JavaScript or Python. Each exercise runs against hidden tests, and the step-by-step solution unlocks after a wrong
        submission. <SolvedCount slugs={items.map((e) => `lld:${e.slug}`)} />
      </p>
      <ul className="plist">
        {items.map((e) => (
          <li key={e.slug}>
            <Link href={`/lld/exercises/${e.slug}`} className="plist-row">
              <SolvedTick slug={`lld:${e.slug}`} />
              <span className="plist-title">{e.meta.title}</span>
              <span className="plist-summary">{e.meta.summary}</span>
              <span className="plist-tags" />
              <span className={`diff diff-${e.meta.difficulty}`}>{e.meta.difficulty}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
