import { Sparkles } from "lucide-react";

export function WidgetFrame({ title, sub, children, eyebrow = "Interactive" }: { title: string; sub?: string; children: React.ReactNode; eyebrow?: string }) {
  return (
    <section className="widget" aria-label={title}>
      <div className="widget-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>
            <Sparkles size={16} aria-hidden className="muted" /> {title}
          </h3>
          {sub && <p className="widget-sub">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Labelled range slider with a live value. */
export function Slider({ label, value, min, max, step = 1, onChange, format = (v: number) => String(v), valueText }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; valueText?: string;
}) {
  return (
    <label className="control">
      <span>
        {label}: <b>{format(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={valueText ?? `${label} ${format(value)}`} />
    </label>
  );
}

export function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="control" style={{ minWidth: 0, flex: "none" }}>
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Secondary controls, logs or tables tucked behind one click, so the widget's picture and main controls fit on one
 * screen (the desktop visual pane is about 640 px tall; a phone screen about 720 px).
 */
export function More({ label = "More controls", children, open }: { label?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="widget-more" open={open}>
      <summary>{label}</summary>
      <div className="widget-more-body">{children}</div>
    </details>
  );
}
