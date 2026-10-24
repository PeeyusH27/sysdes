import type { SayIt } from "@content/extras";
import { CopyButton } from "./CopyButton";

const asText = (title: string, s: SayIt) =>
  [
    `${title}: the 30-second version`,
    "",
    s.answer,
    "",
    ...s.numbers.map((n) => `${n.value}  ${n.label}`),
    "",
    "Trade-offs:",
    ...s.tradeoffs.map((t) => `- ${t}`),
    "",
    `Bring up first: ${s.mention}`,
  ].join("\n");

/**
 * "Say it in 30 seconds": the card you could read aloud in an interview. The answer, three numbers worth knowing, three
 * trade-offs, and the one failure to raise before you are asked. Prints cleanly and copies as plain text.
 */
export function SayItCard({ title, say }: { title: string; say: SayIt }) {
  return (
    <section className="saycard" aria-label="Say it in 30 seconds">
      <header className="saycard-head">
        <span className="eyebrow">Say it in 30 seconds</span>
        <CopyButton text={asText(title, say)} label="the 30-second answer" />
      </header>
      <ul className="saycard-numbers" aria-label="Numbers to know">
        {say.numbers.map((n) => (
          <li key={n.label}>
            <b>{n.value}</b>
            <span>{n.label}</span>
          </li>
        ))}
      </ul>
      <details className="saycard-more">
        <summary>Show what to say</summary>
        <p className="saycard-answer">&ldquo;{say.answer}&rdquo;</p>
        <div className="saycard-cols">
          <div>
            <h4>Trade-offs</h4>
            <ul>
              {say.tradeoffs.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="saycard-mention">
            <h4>Bring it up before they ask</h4>
            <p>{say.mention}</p>
          </div>
        </div>
      </details>
    </section>
  );
}
