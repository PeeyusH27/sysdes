"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Pencil, Play, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/content/CopyButton";
import { runScript, type ScriptOutcome } from "@/lib/dsa/runner";
import { ConsoleOutput } from "./ConsoleOutput";

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false, loading: () => <div className="code-editor code-editor--loading">Loading editor…</div> });

/** `prelude` is hidden code (an imported template) that runs before the visible snippet. */
export function RunCodeClient({ code, prelude = "", html, title }: { code: string; prelude?: string; html: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [version, setVersion] = useState(0);
  const [out, setOut] = useState<ScriptOutcome | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const visible = editing ? draft : code;
    const offset = prelude ? prelude.split("\n").length : 0;
    const result = await runScript(prelude ? `${prelude}\n${visible}` : visible);
    // Report error lines relative to the code the reader can see.
    if (result.error?.line) result.error.line = result.error.line > offset ? result.error.line - offset : null;
    setOut(result);
    setRunning(false);
  };

  return (
    <figure className="code-block run-code">
      <figcaption>
        <span className="run-title">{title}</span>
        <span className="run-actions">
          {editing && draft !== code && (
            <button
              type="button"
              className="run-btn"
              onClick={() => {
                setDraft(code);
                setVersion((n) => n + 1);
              }}
              title="Restore the original code"
            >
              <RotateCcw size={12} aria-hidden /> Reset
            </button>
          )}
          <button type="button" className="run-btn" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            <Pencil size={12} aria-hidden /> {editing ? "Done" : "Edit"}
          </button>
          <button type="button" className="run-btn run-btn--primary" onClick={run} disabled={running}>
            {running ? <Loader2 size={12} className="spin" aria-hidden /> : <Play size={12} aria-hidden />} Run
          </button>
        </span>
      </figcaption>
      {editing ? (
        <CodeEditor key={version} initial={draft} onChange={setDraft} onRun={run} onSubmit={run} label={`Edit ${title}`} />
      ) : (
        <>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <CopyButton text={code} />
        </>
      )}
      {out && <ConsoleOutput outcome={out} onClear={() => setOut(null)} />}
    </figure>
  );
}
