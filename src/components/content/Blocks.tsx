import { AlertTriangle, Info, Lightbulb, MessageSquare } from "lucide-react";

export function TLDR({ children }: { children: React.ReactNode }) {
  return (
    <div className="tldr">
      <span className="eyebrow">30-second answer</span>
      <div>{children}</div>
    </div>
  );
}

const CALLOUT_ICONS = { interview: MessageSquare, warning: AlertTriangle, tip: Lightbulb, note: Info };
const CALLOUT_TITLES = { interview: "Say this in the interview", warning: "Common mistakes", tip: "Tip", note: "Note" };

export function Callout({ kind = "note", title, children }: { kind?: keyof typeof CALLOUT_ICONS; title?: string; children: React.ReactNode }) {
  const Icon = CALLOUT_ICONS[kind];
  return (
    <aside className="callout" data-kind={kind}>
      <Icon size={18} aria-hidden />
      <div>
        <strong className="callout-title">{title ?? CALLOUT_TITLES[kind]}</strong>
        {children}
      </div>
    </aside>
  );
}

export function Requirements({ functional = [], nonFunctional = [], outOfScope = [] }: { functional?: string[]; nonFunctional?: string[]; outOfScope?: string[] }) {
  const cols: [string, string[]][] = [
    ["Functional", functional],
    ["Non-functional", nonFunctional],
    ["Out of scope", outOfScope],
  ];
  return (
    <div className="req-grid">
      {cols
        .filter(([, items]) => items.length)
        .map(([title, items]) => (
          <section key={title}>
            <h4>{title}</h4>
            <ul>
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <li className="step">
      <div className="step-body">
        <h4>{title}</h4>
        {children}
      </div>
    </li>
  );
}

export function FollowUps({ children }: { children: React.ReactNode }) {
  return <div className="followups">{children}</div>;
}

export function FollowUp({ q, children, open = false }: { q: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open}>
      <summary>{q}</summary>
      <div className="answer">{children}</div>
    </details>
  );
}
