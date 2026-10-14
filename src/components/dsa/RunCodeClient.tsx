"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Info, Loader2, Pencil, Play, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/content/CopyButton";
import { runScript, type ScriptOutcome } from "@/lib/dsa/runner";
import { runScriptPy, usePythonStatus } from "@/lib/dsa/py-runner";
import { setCodeLang, useCodeLang, type CodeLang } from "@/lib/code-lang";
import { ConsoleOutput } from "./ConsoleOutput";
import { LangSwitch } from "./LangSwitch";
import { PythonStatus } from "./PythonStatus";

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false, loading: () => <div className="code-editor code-editor--loading">Loading editor…</div> });

type PySnippet = { code: string; prelude: string; modules: Record<string, string>; html: string; title: string };
type JavaSnippet = { code: string; html: string; title: string };
type Version = { lang: CodeLang; code: string; html: string; title: string; runnable: boolean };

/** Python's traceback counts the hidden prelude lines: renumber its `main.py` lines to match the code shown. */
function shiftLines(out: ScriptOutcome, offset: number): ScriptOutcome {
  if (!out.error || !offset) return out;
  const line = out.error.line && out.error.line > offset ? out.error.line - offset : null;
  const traceback = out.error.traceback?.replace(/File "main\.py", line (\d+)/g, (_, n: string) => `File "main.py", line ${Math.max(1, Number(n) - offset)}`);
  return { ...out, error: { ...out.error, line, traceback } };
}

/**
 * `prelude` is hidden code (an imported template) that runs before the visible snippet. `python` and `java` add a
 * language switch; the choice is the site-wide one (src/lib/code-lang.ts). Java is shown, not run.
 */
export function RunCodeClient({ code, prelude = "", html, title, python, java }: { code: string; prelude?: string; html: string; title: string; python?: PySnippet; java?: JavaSnippet }) {
  const versions: Version[] = [{ lang: "js", code, html, title, runnable: true }];
  if (java) versions.push({ lang: "java", ...java, runnable: false });
  if (python) versions.push({ lang: "python", code: python.code, html: python.html, title: python.title, runnable: true });
  const chosen = useCodeLang();
  // A block that doesn't offer the reader's language shows JavaScript; the preference is kept.
  const v = versions.find((x) => x.lang === chosen) ?? versions[0];

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<CodeLang, string>>>({});
  const [version, setVersion] = useState(0);
  const [out, setOut] = useState<(ScriptOutcome & { lang: CodeLang }) | null>(null);
  const [running, setRunning] = useState(false);
  const py = usePythonStatus();

  const draft = drafts[v.lang] ?? v.code;
  const isEditing = editing && v.runnable;

  const run = async () => {
    if (running || !v.runnable) return;
    setRunning(true);
    const visible = isEditing ? draft : v.code;
    let result: ScriptOutcome;
    if (v.lang === "python" && python) {
      const offset = python.prelude ? python.prelude.split("\n").length : 0;
      result = shiftLines(await runScriptPy(python.prelude ? `${python.prelude}\n${visible}` : visible, python.modules), offset);
    } else {
      const offset = prelude ? prelude.split("\n").length : 0;
      result = await runScript(prelude ? `${prelude}\n${visible}` : visible);
      // Report error lines relative to the code the reader can see.
      if (result.error?.line) result.error.line = result.error.line > offset ? result.error.line - offset : null;
    }
    setOut({ ...result, lang: v.lang });
    setRunning(false);
  };

  const shownOut = out && out.lang === v.lang ? out : null;
  const loadingPy = v.lang === "python" && running && (py.phase === "loading" || py.phase === "starting");

  return (
    <figure className="code-block run-code" data-lang={v.lang}>
      <figcaption>
        {versions.length > 1 && <LangSwitch langs={versions.map((x) => x.lang)} value={v.lang} onPick={setCodeLang} className="run-langs" />}
        <span className="run-title">{v.title}</span>
        <span className="run-actions">
          <CopyButton key={`copy-${v.lang}`} text={isEditing ? draft : v.code} label={v.title} />
          {v.runnable && isEditing && draft !== v.code && (
            <button
              type="button"
              className="run-btn"
              onClick={() => {
                setDrafts((d) => ({ ...d, [v.lang]: v.code }));
                setVersion((n) => n + 1);
              }}
              title="Restore the original code"
            >
              <RotateCcw size={12} aria-hidden /> Reset
            </button>
          )}
          {v.runnable && (
            <button type="button" className="run-btn" aria-pressed={isEditing} onClick={() => setEditing((e) => !e)}>
              <Pencil size={12} aria-hidden /> {isEditing ? "Done" : "Edit"}
            </button>
          )}
          {v.runnable && (
            <button type="button" className="run-btn run-btn--primary" onClick={run} disabled={running}>
              {running ? <Loader2 size={12} className="spin" aria-hidden /> : <Play size={12} aria-hidden />} Run
            </button>
          )}
        </span>
      </figcaption>
      {!v.runnable && (
        <p className="run-note">
          <Info size={13} aria-hidden /> Java can&apos;t run in the browser here: switch to JavaScript or Python to run this.
        </p>
      )}
      {isEditing ? (
        <CodeEditor
          key={`${v.lang}-${version}`}
          lang={v.lang === "python" ? "python" : "js"}
          initial={draft}
          onChange={(c) => setDrafts((d) => ({ ...d, [v.lang]: c }))}
          onRun={run}
          onSubmit={run}
          label={`Edit ${v.title}`}
        />
      ) : (
        <div key={v.lang} dangerouslySetInnerHTML={{ __html: v.html }} />
      )}
      {loadingPy && (
        <div className="console-out">
          <PythonStatus status={py} />
        </div>
      )}
      {shownOut && !loadingPy && <ConsoleOutput outcome={shownOut} onClear={() => setOut(null)} />}
    </figure>
  );
}
