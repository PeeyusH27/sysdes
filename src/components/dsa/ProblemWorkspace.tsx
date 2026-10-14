"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Braces, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, CloudOff, Info, Lightbulb, ListChecks, Loader2, Lock, Play, RotateCcw, Send, Unlock, XCircle } from "lucide-react";
import { useHydrated } from "@/lib/hooks";
import { useProgress } from "@/lib/progress";
import { useDrafts, useDsa } from "@/lib/dsa/store";
import { runTests, type ErrorInfo, type RunOutcome, type TestResult } from "@/lib/dsa/runner";
import { bootPython, runTestsPy, usePythonStatus, type PyRunOutcome } from "@/lib/dsa/py-runner";
import { snakeCase } from "@/lib/dsa/python";
import type { RunnableProblem } from "@/lib/dsa/schema";
import { CODE_LANG_LABELS, RUNNABLE_LANGS, setCodeLang, useCodeLang, type RunnableLang } from "@/lib/code-lang";
import { LogLines } from "./ConsoleOutput";
import { LangSwitch } from "./LangSwitch";
import { PythonStatus } from "./PythonStatus";

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false, loading: () => <div className="code-editor code-editor--loading">Loading editor…</div> });

type Mode = "run" | "submit";
type Outcome = RunOutcome & { mode: Mode; passed: boolean; lang: RunnableLang; unavailable?: string };
type Docs = Record<RunnableLang, string>;

export interface WorkspaceProps {
  problem: RunnableProblem;
  starter: string;
  /** Python starter (snake_case names, type hints). */
  starterPy: string;
  patterns: { slug: string; title: string }[];
  js: { id: string; title: string }[];
  statement: React.ReactNode;
  solution: React.ReactNode;
  position: { index: number; total: number };
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
}

export function ProblemWorkspace({ problem, starter, starterPy, patterns, js, statement, solution, position, prev, next }: WorkspaceProps) {
  const { slug } = problem;
  const hydrated = useHydrated();
  const solved = useDsa((s) => !!s.solved[slug]);
  const failed = useDsa((s) => s.failed[slug] ?? 0);
  const recordSubmit = useDsa((s) => s.recordSubmit);
  const toggleSolved = useDsa((s) => s.toggleSolved);
  const saveDraft = useDrafts((s) => s.save);
  const clearDraft = useDrafts((s) => s.clear);
  const javaFallback = useDrafts((s) => s.javaFallback);
  const setJavaFallback = useDrafts((s) => s.setJavaFallback);
  // The site-wide language. Java can't run in the browser, so with Java chosen the editor uses JavaScript or Python.
  const siteLang = useCodeLang();
  const lang: RunnableLang = siteLang === "java" ? javaFallback : siteLang;
  const starters = useMemo<Docs>(() => ({ js: starter, python: starterPy }), [starter, starterPy]);

  const unlocked = hydrated && failed > 0;
  const [tab, setTab] = useState<"description" | "hints" | "solution">("description");
  const [hintsShown, setHintsShown] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [running, setRunning] = useState<Mode | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  // What each language's editor mounts with. The live text is in `code`; this is refreshed when the language changes.
  const [docs, setDocs] = useState<Docs | null>(null);
  const code = useRef<Docs>({ js: starter, python: starterPy });
  // One save timer per language, so switching language mid-typing doesn't drop the other one's last edit.
  const saveTimers = useRef<Partial<Record<RunnableLang, ReturnType<typeof setTimeout>>>>({});
  const visit = useProgress((s) => s.visit);
  useEffect(() => visit(`/dsa/problems/${slug}`), [visit, slug]);

  // The editor mounts after hydration with the saved drafts (localStorage), so the server render never depends on them.
  useEffect(() => {
    if (!hydrated || docs !== null) return;
    const d = useDrafts.getState();
    code.current = { js: d.code[slug] ?? starter, python: d.python[slug] ?? starterPy };
    setDocs({ ...code.current });
  }, [hydrated, docs, slug, starter, starterPy]);

  // A language switch (here, in another tab, or by the site-wide preference) remounts the editor with that
  // language's latest text, and clears results that belong to the other language.
  useEffect(() => {
    setDocs((d) => (d ? { ...code.current } : d));
    setOutcome((o) => (o && o.lang !== lang ? null : o));
    if (lang === "python") bootPython().catch(() => {});
  }, [lang]);

  const onChange = useCallback(
    (c: string) => {
      code.current = { ...code.current, [lang]: c };
      clearTimeout(saveTimers.current[lang]);
      saveTimers.current[lang] = setTimeout(() => (c === starters[lang] ? clearDraft(slug, lang) : saveDraft(slug, c, lang)), 400);
    },
    [slug, lang, starters, saveDraft, clearDraft],
  );

  const pickLang = (l: RunnableLang) => {
    if (running) return;
    setCodeLang(l);
    setJavaFallback(l);
  };

  const execute = useCallback(
    async (mode: Mode) => {
      if (running) return;
      setRunning(mode);
      const src = code.current[lang];
      const sampleCount = Math.min(problem.samples, problem.tests.length);
      const indices = mode === "run" ? Array.from({ length: sampleCount }, (_, i) => i) : undefined;
      const out: PyRunOutcome = lang === "python" ? await runTestsPy(src, problem, indices).promise : await runTests(src, problem, indices).promise;
      const unavailable = out.unavailable;
      const passed = !unavailable && !out.compileError && out.timedOut === null && out.results.length === out.total && out.results.every((r) => r.pass);
      // Nothing ran when Python couldn't load, so it isn't a submission. A solve counts once, in any language.
      if (mode === "submit" && !unavailable) {
        const firstFailure = !passed && (useDsa.getState().failed[slug] ?? 0) === 0;
        recordSubmit(slug, passed);
        if (firstFailure) setJustUnlocked(true);
      }
      setOutcome({ ...out, mode, passed, lang, unavailable });
      setRunning(null);
    },
    [running, problem, slug, lang, recordSubmit],
  );

  const errorLine = outcome?.compileError?.line ?? outcome?.results.find((r) => r.error?.line)?.error?.line ?? null;

  const reset = () => {
    const fresh = starters[lang];
    if (code.current[lang] !== fresh && !window.confirm("Replace your code with the starter code?")) return;
    code.current = { ...code.current, [lang]: fresh };
    clearDraft(slug, lang);
    setDocs({ ...code.current });
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
              {js.length > 0 && lang === "js" && (
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
          <LangSwitch langs={RUNNABLE_LANGS} value={lang} onPick={pickLang} disabled={!!running} className="pw-langs" />
          <button type="button" className="wbtn" onClick={reset} title="Restore the starter code">
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
          <span className="pw-spacer" />
          <button type="button" className="wbtn" onClick={() => execute("run")} disabled={!!running || docs === null} title="Run the example tests (Ctrl/⌘ + ')">
            {running === "run" ? <Loader2 size={14} className="spin" aria-hidden /> : <Play size={14} aria-hidden />} Run examples
          </button>
          <button type="button" className="wbtn primary" onClick={() => execute("submit")} disabled={!!running || docs === null} title="Run every test (Ctrl/⌘ + Enter)">
            {running === "submit" ? <Loader2 size={14} className="spin" aria-hidden /> : <Send size={14} aria-hidden />} Submit
          </button>
          {siteLang === "java" && (
            <p className="pw-langnote">
              <Info size={14} aria-hidden /> Java can&apos;t run in the browser here, so you practise in {CODE_LANG_LABELS[lang]}.
            </p>
          )}
        </div>
        <div className="pw-editor">
          {docs === null ? (
            <pre className="code-editor code-editor--loading">{starter}</pre>
          ) : (
            <CodeEditor
              key={`${lang}-${editorKey}`}
              lang={lang}
              initial={docs[lang]}
              onChange={onChange}
              onRun={() => execute("run")}
              onSubmit={() => execute("submit")}
              errorLine={outcome?.lang === lang ? errorLine : null}
              label={`${CODE_LANG_LABELS[lang]} solution code for ${problem.title}`}
            />
          )}
        </div>
        <Results
          outcome={outcome}
          running={running}
          lang={lang}
          problem={problem}
          justUnlocked={justUnlocked}
          onShowSolution={() => {
            setTab("solution");
            setJustUnlocked(false);
          }}
          onUseJs={() => pickLang("js")}
          next={next}
        />
      </section>
    </div>
  );
}

function Results({
  outcome,
  running,
  lang,
  problem,
  justUnlocked,
  onShowSolution,
  onUseJs,
  next,
}: {
  outcome: Outcome | null;
  running: Mode | null;
  lang: RunnableLang;
  problem: RunnableProblem;
  justUnlocked: boolean;
  onShowSolution: () => void;
  onUseJs: () => void;
  next?: { slug: string; title: string };
}) {
  const [view, setView] = useState<"tests" | "console">("tests");
  const [picked, setPicked] = useState<number | null>(null);
  const uid = useId();
  const py = usePythonStatus();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(null);
  }, [outcome]);

  const logs = useMemo(() => outcome?.results.filter((r) => r.logs.length) ?? [], [outcome]);
  // First load, a restart after a time limit, or a failed download: shown above whatever else is here.
  const pyBusy = lang === "python" && (py.phase === "loading" || py.phase === "starting" || (py.phase === "error" && !outcome?.unavailable));
  const pyNote = pyBusy ? <PythonStatus status={py} /> : null;

  if (running && (!outcome || pyBusy)) {
    return (
      <div className="pw-results" aria-live="polite">
        {pyNote ?? (
          <p className="pw-status">
            <Loader2 size={15} className="spin" aria-hidden /> Running {running === "run" ? "the examples" : "all tests"}…
          </p>
        )}
      </div>
    );
  }
  if (!outcome) {
    const renamed = problem.kind === "design" ? problem.tests.flatMap((t) => t.ops).find((op) => op !== problem.className && snakeCase(op) !== op) : undefined;
    return (
      <div className="pw-results">
        {pyNote}
        <p className="pw-status muted">
          <kbd>Ctrl/⌘</kbd> + <kbd>&apos;</kbd> runs the examples, <kbd>Ctrl/⌘</kbd> + <kbd>Enter</kbd> submits. Use <code>{lang === "python" ? "print()" : "console.log"}</code> freely:
          output shows under Console.
          {lang === "python" && renamed && (
            <>
              {" "}
              In Python, methods are snake_case: <code>{renamed}</code> becomes <code>{snakeCase(renamed)}</code>.
            </>
          )}{" "}
          In the editor, press <kbd>Esc</kbd> then <kbd>Tab</kbd> to move focus out.
        </p>
      </div>
    );
  }
  if (outcome.unavailable) {
    return (
      <div className="pw-results" aria-live="polite">
        <div className="pw-results-head">
          <strong className="pw-headline">
            <span className="warn-ink">
              <CloudOff size={16} aria-hidden /> Python isn&apos;t available
            </span>
          </strong>
        </div>
        <p className="pw-note">{outcome.unavailable} Nothing ran, so this didn&apos;t count as a submission.</p>
        <button type="button" className="btn btn-sm" onClick={onUseJs}>
          Switch to JavaScript
        </button>
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
      {pyNote}
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
          {outcome.compileError && <pre className="pw-error">{errorText(outcome.compileError, "\n")}</pre>}
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
            <p className="muted">{lang === "python" ? "Nothing printed. Add print(…) to your code to inspect values." : "Nothing logged. Add console.log(…) to your code to inspect values."}</p>
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

/** "Name: message (line n)", or Python's traceback through the learner's code (it names the line itself). */
function errorText(e: ErrorInfo, sep: string) {
  if (e.traceback) return e.traceback;
  return `${e.name}: ${e.message}${e.line ? `${sep}(line ${e.line})` : ""}`;
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
            <pre className="pw-error">{errorText(r.error, " ")}</pre>
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
