"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Braces, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Lightbulb, ListChecks, Loader2, Lock, Play, RotateCcw, Send, Unlock, XCircle } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";
import { useDrafts, useDsa } from "@/lib/dsa/store";
import { runTests, type RunOutcome, type TestResult } from "@/lib/dsa/runner";
import type { RunnableProblem } from "@/lib/dsa/schema";
import { LogLines } from "./ConsoleOutput";

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false, loading: () => <div className="code-editor code-editor--loading">Loading editor…</div> });

type Mode = "run" | "submit";
type Outcome = RunOutcome & { mode: Mode; passed: boolean };

export interface WorkspaceProps {
  problem: RunnableProblem;
  starter: string;
  patterns: { slug: string; title: string }[];
  js: { id: string; title: string }[];
  statement: React.ReactNode;
  solution: React.ReactNode;
  position: { index: number; total: number };
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
}

export function ProblemWorkspace({ problem, starter, patterns, js, statement, solution, position, prev, next }: WorkspaceProps) {
  const { slug } = problem;
  const hydrated = useHydrated();
  const solved = useDsa((s) => !!s.solved[slug]);
  const failed = useDsa((s) => s.failed[slug] ?? 0);
  const recordSubmit = useDsa((s) => s.recordSubmit);
  const toggleSolved = useDsa((s) => s.toggleSolved);
  const saveDraft = useDrafts((s) => s.save);
  const clearDraft = useDrafts((s) => s.clear);

  const unlocked = hydrated && failed > 0;
  const [tab, setTab] = useState<"description" | "hints" | "solution">("description");
  const [hintsShown, setHintsShown] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [running, setRunning] = useState<Mode | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [initial, setInitial] = useState<string | null>(null);
  const code = useRef(starter);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const visit = useProgress((s) => s.visit);
  useEffect(() => visit(`/dsa/problems/${slug}`), [visit, slug]);

  // The editor mounts after hydration with the saved draft (localStorage), so the server render never depends on it.
  useEffect(() => {
    if (!hydrated || initial !== null) return;
    const draft = useDrafts.getState().code[slug];
    code.current = draft ?? starter;
    setInitial(code.current);
  }, [hydrated, initial, slug, starter]);

  const onChange = useCallback(
    (c: string) => {
      code.current = c;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => (c === starter ? clearDraft(slug) : saveDraft(slug, c)), 400);
    },
    [slug, starter, saveDraft, clearDraft],
  );

  const execute = useCallback(
    async (mode: Mode) => {
      if (running) return;
      setRunning(mode);
      const sampleCount = Math.min(problem.samples, problem.tests.length);
      const indices = mode === "run" ? Array.from({ length: sampleCount }, (_, i) => i) : undefined;
      const out = await runTests(code.current, problem, indices).promise;
      const passed = !out.compileError && out.timedOut === null && out.results.length === out.total && out.results.every((r) => r.pass);
      if (mode === "submit") {
        const firstFailure = !passed && (useDsa.getState().failed[slug] ?? 0) === 0;
        recordSubmit(slug, passed);
        if (firstFailure) setJustUnlocked(true);
      }
      setOutcome({ ...out, mode, passed });
      setRunning(null);
    },
    [running, problem, slug, recordSubmit],
  );

  const errorLine = outcome?.compileError?.line ?? outcome?.results.find((r) => r.error?.line)?.error?.line ?? null;

  const reset = () => {
    if (code.current !== starter && !window.confirm("Replace your code with the starter code?")) return;
    code.current = starter;
    clearDraft(slug);
    setInitial(starter);
    setEditorKey((k) => k + 1);
    setOutcome(null);
  };

  const uid = useId();
  const tabs = [
    { id: "description" as const, label: "Description", icon: ListChecks },
    { id: "hints" as const, label: `Hints (${problem.hints.length})`, icon: Lightbulb },
    { id: "solution" as const, label: "Solution", icon: unlocked ? Unlock : Lock },
  ];

  return (
    <div className="pw">
      <section className="pw-left" aria-label="Problem">
        <header className="pw-head">
          <nav className="pw-crumbs" aria-label="Breadcrumb">
            <Link href="/dsa/problems">Problems</Link>
            <span aria-hidden>/</span>
            {patterns[0] && <Link href={`/dsa/patterns/${patterns[0].slug}`}>{patterns[0].title}</Link>}
            <span className="muted pw-pos">
              {position.index + 1} of {position.total}
            </span>
          </nav>
          <h1>{problem.title}</h1>
          <div className="pw-meta">
            <span className={`diff diff-${problem.difficulty}`}>{problem.difficulty}</span>
            {patterns.map((p) => (
              <Link key={p.slug} href={`/dsa/patterns/${p.slug}`} className="tag">
                {p.title}
              </Link>
            ))}
            <button type="button" className="btn btn-sm pw-solved" aria-pressed={hydrated && solved} onClick={() => toggleSolved(slug)} title={hydrated && solved ? "Click to mark as not solved" : "Mark as solved without submitting"}>
              {hydrated && solved ? <CheckCircle2 size={14} className="ok-ink" aria-hidden /> : <Circle size={14} aria-hidden />}
              {hydrated && solved ? "Solved" : "Mark solved"}
            </button>
          </div>
        </header>
        <div className="pw-tabs" role="tablist" aria-label="Problem sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${uid}-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${uid}-${t.id}-panel`}
              onClick={() => {
                setTab(t.id);
                if (t.id === "solution") setJustUnlocked(false);
              }}
            >
              <t.icon size={14} aria-hidden /> {t.label}
              {t.id === "solution" && justUnlocked && <span className="pw-dot" aria-label="newly unlocked" />}
            </button>
          ))}
        </div>
        <div className="pw-panel prose" role="tabpanel" id={`${uid}-${tab}-panel`} aria-labelledby={`${uid}-${tab}`}>
          {tab === "description" && (
            <>
              {statement}
              {js.length > 0 && (
                <p className="js-ref-row">
                  <span className="js-ref-label">JavaScript you&apos;ll use:</span>{" "}
                  {js.map((t) => (
                    <Link key={t.id} href={`/dsa/js#${t.id}`} className="js-ref">
                      <Braces size={12} aria-hidden /> {t.title}
                    </Link>
                  ))}
                </p>
              )}
            </>
          )}
          {tab === "hints" && (
            <div className="pw-hints">
              <p className="muted">Reveal one hint at a time; each one gives away a little more.</p>
              <ol>
                {problem.hints.slice(0, hintsShown).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
              {hintsShown < problem.hints.length && (
                <button type="button" className="btn btn-sm" onClick={() => setHintsShown((n) => n + 1)}>
                  <Lightbulb size={14} aria-hidden /> Show hint {hintsShown + 1}
                </button>
              )}
            </div>
          )}
          {tab === "solution" &&
            (unlocked ? (
              solution
            ) : (
              <div className="pw-locked">
                <Lock size={22} aria-hidden />
                <h3>The solution is locked</h3>
                <p>
                  It unlocks after your first <strong>wrong submission</strong>. Give the problem an honest attempt, then press <strong>Submit</strong>. If any
                  test fails, a step-by-step walkthrough of the approach appears here.
                </p>
                <p className="muted">Stuck before you can write anything? Try the hints first.</p>
                <button type="button" className="btn btn-sm" onClick={() => setTab("hints")}>
                  <Lightbulb size={14} aria-hidden /> Show hints
                </button>
              </div>
            ))}
        </div>
        <nav className="pw-prevnext" aria-label="Previous and next problem">
          {prev ? (
            <Link href={`/dsa/problems/${prev.slug}`}>
              <ChevronLeft size={15} aria-hidden /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/dsa/problems/${next.slug}`}>
              {next.title} <ChevronRight size={15} aria-hidden />
            </Link>
          )}
        </nav>
      </section>

      <section className="pw-right" aria-label="Code">
        <div className="pw-toolbar">
          <span className="pw-lang">JavaScript</span>
          <button type="button" className="wbtn" onClick={reset} title="Restore the starter code">
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
          <span className="pw-spacer" />
          <button type="button" className="wbtn" onClick={() => execute("run")} disabled={!!running || initial === null} title="Run the example tests (Ctrl/⌘ + ')">
            {running === "run" ? <Loader2 size={14} className="spin" aria-hidden /> : <Play size={14} aria-hidden />} Run examples
          </button>
          <button type="button" className="wbtn primary" onClick={() => execute("submit")} disabled={!!running || initial === null} title="Run every test (Ctrl/⌘ + Enter)">
            {running === "submit" ? <Loader2 size={14} className="spin" aria-hidden /> : <Send size={14} aria-hidden />} Submit
          </button>
        </div>
        <div className="pw-editor">
          {initial === null ? (
            <pre className="code-editor code-editor--loading">{starter}</pre>
          ) : (
            <CodeEditor key={editorKey} initial={initial} onChange={onChange} onRun={() => execute("run")} onSubmit={() => execute("submit")} errorLine={errorLine} label={`Solution code for ${problem.title}`} />
          )}
        </div>
        <Results
          outcome={outcome}
          running={running}
          justUnlocked={justUnlocked}
          onShowSolution={() => {
            setTab("solution");
            setJustUnlocked(false);
          }}
          next={next}
        />
      </section>
    </div>
  );
}

function Results({ outcome, running, justUnlocked, onShowSolution, next }: { outcome: Outcome | null; running: Mode | null; justUnlocked: boolean; onShowSolution: () => void; next?: { slug: string; title: string } }) {
  const [view, setView] = useState<"tests" | "console">("tests");
  const [picked, setPicked] = useState<number | null>(null);
  const uid = useId();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(null);
  }, [outcome]);

  const logs = useMemo(() => outcome?.results.filter((r) => r.logs.length) ?? [], [outcome]);

  if (running && !outcome) {
    return (
      <div className="pw-results" aria-live="polite">
        <p className="pw-status">
          <Loader2 size={15} className="spin" aria-hidden /> Running {running === "run" ? "the examples" : "all tests"}…
        </p>
      </div>
    );
  }
  if (!outcome) {
    return (
      <div className="pw-results">
        <p className="pw-status muted">
          <kbd>Ctrl/⌘</kbd> + <kbd>&apos;</kbd> runs the examples, <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> submits. Use <code>console.log</code> freely: output shows under
          Console. In the editor, press <kbd>Esc</kbd> then <kbd>Tab</kbd> to move focus out.
        </p>
      </div>
    );
  }

  const passCount = outcome.results.filter((r) => r.pass).length;
  const firstBad = outcome.results.find((r) => !r.pass);
  const shown: TestResult | undefined = picked !== null ? outcome.results.find((r) => r.index === picked) : (firstBad ?? outcome.results[0]);

  let headline: React.ReactNode;
  if (outcome.compileError) {
    headline = (
      <span className="bad-ink">
        <XCircle size={16} aria-hidden /> {outcome.compileError.name}
      </span>
    );
  } else if (outcome.timedOut !== null) {
    headline = (
      <span className="warn-ink">
        <Clock size={16} aria-hidden /> Time limit exceeded on test {outcome.timedOut + 1}
      </span>
    );
  } else if (outcome.passed) {
    headline = (
      <span className="ok-ink">
        <CheckCircle2 size={16} aria-hidden /> {outcome.mode === "submit" ? "Accepted" : "Examples pass"}: {passCount}/{outcome.total} tests
      </span>
    );
  } else {
    headline = (
      <span className="bad-ink">
        <XCircle size={16} aria-hidden /> {outcome.mode === "submit" ? "Wrong answer" : "Examples fail"}: {passCount}/{outcome.total} passed
      </span>
    );
  }

  return (
    <div className="pw-results">
      <div className="pw-results-head" aria-live="polite">
        <strong className="pw-headline">{headline}</strong>
        <div className="pw-rtabs" role="tablist" aria-label="Results">
          <button type="button" role="tab" id={`${uid}-t`} aria-selected={view === "tests"} onClick={() => setView("tests")}>
            Tests
          </button>
          <button type="button" role="tab" id={`${uid}-c`} aria-selected={view === "console"} onClick={() => setView("console")}>
            Console{logs.length ? ` (${logs.reduce((n, r) => n + r.logs.length, 0)})` : ""}
          </button>
        </div>
      </div>

      {outcome.mode === "submit" && outcome.passed && (
        <div className="pw-banner pw-banner--ok">
          <CheckCircle2 size={16} aria-hidden /> Solved and marked complete.
          {next && (
            <Link href={`/dsa/problems/${next.slug}`} className="link">
              Next: {next.title} →
            </Link>
          )}
        </div>
      )}
      {justUnlocked && (
        <div className="pw-banner">
          <Unlock size={16} aria-hidden /> Not quite. The step-by-step solution is now unlocked.
          <button type="button" className="link" onClick={onShowSolution}>
            Open the solution
          </button>
        </div>
      )}

      {view === "tests" ? (
        <div role="tabpanel" aria-labelledby={`${uid}-t`}>
          {outcome.compileError && (
            <pre className="pw-error">
              {outcome.compileError.name}: {outcome.compileError.message}
              {outcome.compileError.line ? `\n(line ${outcome.compileError.line})` : ""}
            </pre>
          )}
          {outcome.timedOut !== null && (
            <p className="pw-note">
              Test {outcome.timedOut + 1} ran for longer than the time limit and was stopped. Look for a loop whose condition never becomes false, or recursion without a base
              case.
            </p>
          )}
          {outcome.results.length > 0 && (
            <div className="pw-dots" role="group" aria-label="Test cases">
              {outcome.results.map((r) => (
                <button key={r.index} type="button" className="pw-case" data-pass={r.pass} aria-pressed={shown?.index === r.index} onClick={() => setPicked(r.index)}>
                  {r.pass ? <CheckCircle2 size={13} aria-hidden /> : <XCircle size={13} aria-hidden />}
                  {r.hidden ? "Test" : "Case"} {r.index + 1}
                  <span className="sr-only">{r.pass ? "passed" : "failed"}</span>
                </button>
              ))}
            </div>
          )}
          {shown && <CaseDetail r={shown} />}
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby={`${uid}-c`} className="pw-console">
          {logs.length === 0 ? (
            <p className="muted">Nothing logged. Add console.log(…) to your code to inspect values.</p>
          ) : (
            logs.map((r) => (
              <div key={r.index} className="pw-log-group">
                <div className="pw-log-title">Test {r.index + 1}</div>
                <LogLines logs={r.logs} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CaseDetail({ r }: { r: TestResult }) {
  return (
    <dl className="pw-case-detail">
      <dt>Input</dt>
      <dd>
        <pre>{r.input}</pre>
      </dd>
      <dt>Expected</dt>
      <dd>
        <pre>{r.expected}</pre>
      </dd>
      <dt>Your output</dt>
      <dd>
        <pre data-pass={r.pass}>{r.error ? "—" : r.received}</pre>
      </dd>
      {r.reason && (
        <>
          <dt>Why it failed</dt>
          <dd>{r.reason}</dd>
        </>
      )}
      {r.error && (
        <>
          <dt>Error</dt>
          <dd>
            <pre className="pw-error">
              {r.error.name}: {r.error.message}
              {r.error.line ? ` (line ${r.error.line})` : ""}
            </pre>
          </dd>
        </>
      )}
      {r.logs.length > 0 && (
        <>
          <dt>Console</dt>
          <dd className="pw-console">
            <LogLines logs={r.logs} />
          </dd>
        </>
      )}
      <dt>Time</dt>
      <dd className="muted">{r.ms} ms</dd>
    </dl>
  );
}
