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

/**
 * Segmented control. The group is always named by `label` (aria-label); `labelMode` says where the label shows:
 * - "above" (default): a caption over the buttons, like the other controls.
 * - "inline": on the same line, so a toolbar row stays one button tall. With `wrap` the buttons drop under the label
 *   when the row is too narrow (otherwise they shrink beside it); `className` swaps the default layout for a widget's
 *   own class (e.g. one with a container query).
 * - "hidden": not shown, for a toolbar with no room for a caption whose options say enough.
 * `compact` sizes the buttons like a .wbtn (32 px tall) and keeps the group from shrinking, to sit in a row of buttons.
 */
export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
  labelMode = "above",
  wrap = false,
  compact = false,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  labelMode?: "above" | "inline" | "hidden";
  wrap?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const group = (
    <div className="seg" role="group" aria-label={label} style={compact ? { lineHeight: "14px", flex: "none" } : undefined}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" title={o.title} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
  if (labelMode === "hidden") return group;
  if (labelMode === "inline")
    return (
      <div className={className} style={className ? undefined : { display: "flex", alignItems: "center", gap: wrap ? "2px 6px" : 6, flexWrap: wrap ? "wrap" : undefined, fontSize: 12.5, color: "var(--muted)" }}>
        <span aria-hidden>{label}</span>
        {group}
      </div>
    );
  return (
    <div className="control" style={{ minWidth: 0, flex: "none" }}>
      <span>{label}</span>
      {group}
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
