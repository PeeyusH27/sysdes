import { Doodle } from "@/components/doodle/Doodle";
import { arts } from "@/components/doodle/registry";
import { DOODLE_NAMES, DSA_DOODLES, LLD_DOODLES, SYSTEM_DOODLES } from "@/components/doodle/names";

export const metadata = { title: "Doodles", description: "The hand-drawn illustrations used across the site.", robots: { index: false } };

const GROUPS = [
  { title: "System design", names: SYSTEM_DOODLES },
  { title: "Low-level design", names: LLD_DOODLES },
  { title: "Coding patterns", names: DSA_DOODLES },
];

export default function DoodlesPage() {
  const drawn = DOODLE_NAMES.filter((n) => arts[n]).length;
  return (
    <div className="container hub">
      <header className="page-head hub-head">
        <p className="eyebrow">Doodles</p>
        <h1>
          Ideas, <span className="grad">drawn by hand</span>
        </h1>
        <p className="lede">
          {drawn} of {DOODLE_NAMES.length} drawn. One small picture per idea, so a page can open with something to look at before the words.
        </p>
      </header>
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`d-${g.title}`}>
          <h2 className="section-title" id={`d-${g.title}`}>
            {g.title}
          </h2>
          <ul className="doodle-grid">
            {g.names.map((n) => (
              <li key={n} data-missing={!arts[n] || undefined}>
                {arts[n] ? <Doodle name={n} size={170} caption label /> : <span className="muted">{n}: not drawn yet</span>}
                <code>{n}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
