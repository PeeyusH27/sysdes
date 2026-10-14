"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import type { FieldSpec } from "./types";

export type RunOutcome = { ok: true } | { ok: false; error: string; field?: string };

const WIDE = new Set<FieldSpec["kind"]>(["ints", "tree", "words", "text", "rows", "lines", "json"]);
const MULTILINE = new Set<FieldSpec["kind"]>(["rows", "lines", "json"]);

/** "Edit input": a small form generated from the trace's fields. Runs on submit; shows the first problem inline. */
export function InputEditor({
  title,
  fields,
  initial,
  onRun,
  onClose,
}: {
  /** The walkthrough's title, so each form is a distinct landmark. */
  title: string;
  fields: FieldSpec[];
  initial: Record<string, string>;
  onRun: (values: Record<string, string>) => Promise<RunOutcome>;
  onClose: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [values, setValues] = useState(initial);
  const [problem, setProblem] = useState<{ error: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    form.current?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const out = await onRun(values);
    setBusy(false);
    if (!out.ok) {
      setProblem(out);
      if (out.field) form.current?.querySelector<HTMLElement>(`[name="${out.field}"]`)?.focus();
    }
  };

  return (
    <form
      ref={form}
      className="algo-input"
      aria-label={`Your input: ${title}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void submit();
        }
      }}
    >
      <div className="algo-fields">
        {fields.map((f) => {
          const id = `${uid}-${f.key}`;
          const bad = problem?.field === f.key;
          const describedBy = [f.help && `${id}-help`, bad && `${uid}-err`].filter(Boolean).join(" ") || undefined;
          const set = (v: string) => {
            setValues((old) => ({ ...old, [f.key]: v }));
            if (problem) setProblem(null);
          };
          if (f.kind === "bool") {
            return (
              <label key={f.key} className="algo-field algo-field--check">
                <input type="checkbox" name={f.key} checked={values[f.key] === "true"} onChange={(e) => set(e.target.checked ? "true" : "false")} />
                <span className="algo-flabel">{f.label}</span>
              </label>
            );
          }
          const common = {
            id,
            name: f.key,
            value: values[f.key] ?? "",
            spellCheck: false,
            autoComplete: "off",
            autoCapitalize: "off",
            "aria-invalid": bad || undefined,
            "aria-describedby": describedBy,
          } as const;
          const numeric = f.kind === "int" && f.min !== undefined && f.min >= 0;
          return (
            <div key={f.key} className={WIDE.has(f.kind) ? "algo-field algo-field--wide" : "algo-field"}>
              <label className="algo-flabel" htmlFor={id}>
                {f.label}
              </label>
              {MULTILINE.has(f.kind) ? (
                <textarea {...common} rows={Math.min(7, Math.max(2, (values[f.key] ?? "").split("\n").length))} onChange={(e) => set(e.target.value)} />
              ) : (
                <input {...common} type="text" inputMode={numeric ? "numeric" : "text"} onChange={(e) => set(e.target.value)} />
              )}
              {f.help && (
                <span className="algo-fhelp" id={`${id}-help`}>
                  {f.help}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="algo-input-foot">
        <p className="algo-input-err" id={`${uid}-err`} role="alert">
          {problem?.error}
        </p>
        <button type="button" className="wbtn" onClick={onClose}>
          <X size={14} aria-hidden />
          Cancel
        </button>
        <button type="submit" className="wbtn primary" disabled={busy} title="Run (Ctrl+Enter)">
          <Play size={14} aria-hidden />
          Run it
        </button>
      </div>
    </form>
  );
}
