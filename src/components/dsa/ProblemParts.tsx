import { CodeBlock } from "@/components/content/CodeBlock";
import { Markdown } from "@/lib/dsa/markdown";
import type { LoadedProblem } from "@/lib/dsa/load";
import type { DesignTest, FnTest } from "@/lib/dsa/schema";

const json = (v: unknown) => JSON.stringify(v);

/** The first `samples` tests, shown as worked examples (they are also what "Run examples" runs). */
export function Examples({ problem }: { problem: LoadedProblem }) {
  const { meta } = problem;
  const samples = meta.tests.slice(0, meta.samples);
  return (
    <>
      {samples.map((t, i) => (
        <div key={i} className="example">
          <h4>Example {i + 1}</h4>
          {meta.kind === "design" ? (
            <pre>
              <b>Input:</b> {json((t as DesignTest).ops)}
              {"\n       "}
              {json((t as DesignTest).args)}
              {"\n"}
              <b>Output:</b> {json(t.expected)}
            </pre>
          ) : (
            <pre>
              <b>Input:</b> {(t as FnTest).args.map((a, k) => `${meta.params[k] ?? `arg${k}`} = ${json(a)}`).join(", ")}
              {"\n"}
              <b>Output:</b> {json(t.expected)}
            </pre>
          )}
          {t.explain && <p className="example-explain">{t.explain}</p>}
        </div>
      ))}
    </>
  );
}

export async function Statement({ problem }: { problem: LoadedProblem }) {
  return (
    <>
      <Markdown source={problem.statement} />
      <h3>Examples</h3>
      <Examples problem={problem} />
      {problem.meta.kind === "design" && (
        <p className="muted" style={{ fontSize: 14 }}>
          Each test creates the class with the first operation, then calls the methods in order. Output lists what each call returns; null marks the constructor
          and methods that return nothing, and their return values aren&apos;t checked.
        </p>
      )}
    </>
  );
}

export async function SolutionView({ problem }: { problem: LoadedProblem }) {
  return (
    <div className="solution">
      <Markdown source={problem.approach} />
      <h3>Code</h3>
      <CodeBlock code={problem.solution} title="solution.js" />
      <h3>Complexity</h3>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th scope="row">Time</th>
              <td>{problem.meta.complexity.time}</td>
            </tr>
            <tr>
              <th scope="row">Space</th>
              <td>{problem.meta.complexity.space}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
