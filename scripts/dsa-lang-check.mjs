// Runs a Python file against a practice problem's tests with the IDE's Python harness (public/dsa-runner.py, here on
// CPython) and judges the results with the JS runner's own rules (compareValues and validators from
// public/dsa-runner.js), exactly as the browser does.
//
//   node scripts/dsa-lang-check.mjs <slug> --file my.py         one problem, one file
//   node scripts/dsa-lang-check.mjs --dir tests/fixtures/python  every <slug>.py in a folder (optionally: slug…)
//   node scripts/dsa-lang-check.mjs --script path/to/try_it.py   a runnable snippet (sibling .py files importable)
//   options: --only 0,3,5 (test indices)  --timeout <ms per test, default problem.timeoutMs or 3000>  --json
//
// Exit code 1 when a test fails or the code doesn't load. Needs python3 on PATH (or $PYTHON).
// The exports (runPython, judge, checkPython…) are used by tests/dsa-python.test.ts.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RUNNER_PY = path.join(ROOT, "public", "dsa-runner.py");
const PROBLEMS = path.join(ROOT, "content", "dsa", "problems");
const PROTOCOL = "@@dsa ";
export const PYTHON = process.env.PYTHON || "python3";

/**
 * @typedef {{ name: string, message: string, line: number | null, traceback?: string | null }} ErrorInfo
 * @typedef {{ level: string, text: string }} LogLine
 * @typedef {{ index: number, actual: unknown, error: ErrorInfo | null, logs: LogLine[], stdout: string, ms: number, stopped?: boolean }} PyTestRun
 * @typedef {{ compileError: ErrorInfo | null, results: PyTestRun[] }} PyOutcome
 * @typedef {{ error: ErrorInfo | null, logs: LogLine[], stdout: string, ms: number }} PyScriptRun
 * @typedef {{ index: number, hidden: boolean, input: string, expected: string, received: string, pass: boolean, error: ErrorInfo | null, reason: string | null, logs: LogLine[], ms: number }} TestResult
 * @typedef {TestResult & { traceback: string | null, stdout: string }} CheckedResult
 * @typedef {{ slug?: string, compileError: ErrorInfo | null, results: CheckedResult[], passed: number, total: number, ok: boolean }} Check
 * @typedef {{ indices?: number[] | null, timeLimitMs?: number }} RunOptions
 * @typedef {{ compareValues: (a: unknown, b: unknown, mode: string) => boolean, show: (v: unknown) => string }} JsHarness
 * @typedef {any} Problem a problem as the browser gets it (problem.json after zod defaults, plus slug)
 */

/** @type {JsHarness | undefined} */
let harness;
/** @returns {JsHarness} The browser's JS runner (public/dsa-runner.js), evaluated once: its compareValues and show judge every language. */
export function jsHarness() {
  if (!harness) {
    new Function(readFileSync(path.join(ROOT, "public", "dsa-runner.js"), "utf8"))();
    harness = /** @type {any} */ (globalThis).__dsaHarness;
  }
  return harness;
}

/**
 * problem.json with the schema's defaults (what the browser receives after zod parsing).
 * @param {string} slug
 * @returns {Problem}
 */
export function loadProblem(slug) {
  const file = path.join(PROBLEMS, slug, "problem.json");
  if (!existsSync(file)) throw new Error(`no problem "${slug}" (${path.relative(ROOT, file)} not found)`);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  return { kind: raw.className ? "design" : "function", compare: "exact", samples: 3, ...raw, slug };
}

/**
 * Python's JSON tags non-finite floats as {"$num": "Infinity"}; turn them back into numbers.
 * @param {string} _key
 * @param {any} v
 */
export const revive = (_key, v) => (v && typeof v === "object" && !Array.isArray(v) && typeof v.$num === "string" && Object.keys(v).length === 1 ? Number(v.$num) : v);

/**
 * @param {object} payload
 * @param {number} timeoutMs
 */
function spawnPython(payload, timeoutMs) {
  const run = spawnSync(PYTHON, ["-I", "-B", RUNNER_PY, "--stdin"], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error && run.error.code === "ENOENT") throw new Error(`${PYTHON} not found: install Python 3.9+ or set $PYTHON`);
  /** @type {any[]} */
  const messages = [];
  for (const line of (run.stdout || "").split("\n")) {
    if (line.startsWith(PROTOCOL)) messages.push(JSON.parse(line.slice(PROTOCOL.length), revive));
  }
  return { messages, stderr: run.stderr || "", status: run.status, timedOut: run.error?.code === "ETIMEDOUT" || run.signal === "SIGTERM" };
}

/**
 * Runs Python `code` against `problem` on CPython. Returns { compileError, results } where each result is the raw
 * TestRun from dsa-runner.py: { index, actual, error, logs, stdout, ms }.
 * @param {Problem} problem
 * @param {string} code
 * @param {RunOptions} [options]
 * @returns {PyOutcome}
 */
export function runPython(problem, code, { indices = null, timeLimitMs } = {}) {
  const limit = timeLimitMs ?? problem.timeoutMs ?? 3000;
  const count = indices ? indices.length : problem.tests.length;
  const run = spawnPython({ mode: "tests", problem, code, indices, timeLimitMs: limit }, count * limit + 10_000);
  const results = run.messages.filter((m) => m.type === "result").map((m) => m.result);
  const done = run.messages.find((m) => m.type === "done");
  if (done) return { compileError: done.compileError, results };
  // The process died or hung (a C-level loop the per-test timer can't interrupt): blame the next test.
  const list = indices ?? problem.tests.map((/** @type {unknown} */ _, /** @type {number} */ i) => i);
  const next = list[results.length];
  const why = run.timedOut ? "Time limit exceeded." : `python3 exited with status ${run.status}: ${run.stderr.trim().split("\n").slice(-3).join(" ")}`;
  if (next !== undefined) results.push({ index: next, actual: null, error: { name: run.timedOut ? "TimeoutError" : "Error", message: why, line: null, traceback: null }, logs: [], stdout: "", ms: 0 });
  return { compileError: null, results };
}

/**
 * Runs a snippet through run_script on CPython: { error, logs, stdout, ms }.
 * @param {string} code
 * @param {Record<string, string>} [modules] module name → source, importable from the snippet
 * @param {{ timeLimitMs?: number }} [options]
 * @returns {PyScriptRun}
 */
export function runPythonScript(code, modules = {}, { timeLimitMs = 5000 } = {}) {
  const run = spawnPython({ mode: "script", code, modules, timeLimitMs }, timeLimitMs + 10_000);
  const msg = run.messages.find((m) => m.type === "script");
  if (msg) return { error: msg.error, logs: msg.logs, stdout: msg.stdout, ms: msg.ms };
  return { error: { name: "Error", message: run.timedOut ? "Time limit exceeded." : `python3 exited with status ${run.status}: ${run.stderr.trim()}`, line: null, traceback: null }, logs: [], stdout: "", ms: 0 };
}

/** @param {unknown} v */
const clone = (v) => (v === undefined ? undefined : structuredClone(v));

/**
 * @param {Problem} problem
 * @param {any} test
 * @param {(v: unknown) => string} show
 */
function describeInput(problem, test, show) {
  if (problem.kind === "design") return `${show(test.ops)}\n${show(test.args)}`;
  const names = problem.params || [];
  return test.args.map((/** @type {unknown} */ a, /** @type {number} */ i) => `${names[i] || `arg${i}`} = ${show(a)}`).join("\n");
}

/** @type {Map<string, (actual: unknown, args: unknown, expected: unknown) => unknown>} */
const validators = new Map();
/** @param {string} src */
function validatorFor(src) {
  if (!validators.has(src)) validators.set(src, new Function(`"use strict"; return (${src});`)());
  return /** @type {(actual: unknown, args: unknown, expected: unknown) => unknown} */ (validators.get(src));
}

/**
 * Raw TestRun from the Python harness → the TestResult shape the IDE shows for JavaScript (src/lib/dsa/runner.ts),
 * judged by the JS runner's rules: compareValues with problem.compare, the problem's validator, and for design
 * problems a per-call check where an expected null (a void call) is not compared. Mirrors runOne in dsa-runner.js.
 * @param {Problem} problem
 * @param {PyTestRun} run
 * @param {JsHarness} [H]
 * @returns {TestResult}
 */
export function judge(problem, run, H = jsHarness()) {
  const test = problem.tests[run.index];
  /** @type {TestResult} */
  const out = {
    index: run.index,
    hidden: run.index >= (problem.samples || 3),
    input: describeInput(problem, test, H.show),
    expected: H.show(test.expected),
    received: "",
    pass: false,
    error: run.error ? { name: run.error.name, message: run.error.message, line: run.error.line ?? null } : null,
    reason: null,
    logs: run.logs || [],
    ms: run.ms || 0,
  };
  if (run.error) return out;
  const actual = run.actual;
  try {
    if (problem.kind === "design") {
      const mode = problem.compare === "float" ? "float" : "exact";
      const outputs = Array.isArray(actual) ? actual : [];
      const bad = outputs.findIndex((/** @type {unknown} */ v, /** @type {number} */ i) => test.expected[i] !== null && !H.compareValues(v, test.expected[i], mode));
      out.pass = bad === -1 && outputs.length === test.expected.length;
      if (!out.pass && bad !== -1) out.reason = `Call ${bad + 1}, ${test.ops[bad]}(${(test.args[bad] || []).map(H.show).join(", ")}): expected ${H.show(test.expected[bad])}, got ${H.show(outputs[bad])}.`;
    } else if (problem.validate) {
      const verdict = validatorFor(problem.validate)(actual, clone(test.args), clone(test.expected));
      out.pass = verdict === true;
      if (!out.pass) out.reason = typeof verdict === "string" ? verdict : "That answer does not satisfy the requirements.";
    } else {
      out.pass = H.compareValues(actual, test.expected, problem.compare || "exact");
    }
    out.received = H.show(actual);
  } catch (/** @type {any} */ err) {
    out.error = { name: err?.name || "Error", message: err?.message || String(err), line: null };
  }
  return out;
}

/**
 * Runs and judges: { slug, compileError, results: TestResult[] (+ traceback, stdout), passed, total, ok }.
 * @param {Problem} problem
 * @param {string} code
 * @param {RunOptions} [opts]
 * @returns {Check}
 */
export function checkPython(problem, code, opts = {}) {
  const H = jsHarness();
  const { compileError, results } = runPython(problem, code, opts);
  const judged = results.map((r) => ({ ...judge(problem, r, H), traceback: r.error?.traceback ?? null, stdout: r.stdout }));
  const total = opts.indices ? opts.indices.length : problem.tests.length;
  const passed = judged.filter((r) => r.pass).length;
  return { slug: problem.slug, compileError, results: judged, passed, total, ok: !compileError && passed === total };
}

// ---------------------------------------------------------------------------------------------------------------------
// Report

/** @param {string} s @param {number} n */
const indent = (s, n) => s.replace(/^/gm, " ".repeat(n));

/**
 * @param {Check} check
 * @param {string} [file]
 */
export function formatReport(check, file) {
  const rel = file && path.relative(process.cwd(), file);
  const shown = rel && !rel.startsWith("..") ? rel : file;
  const lines = [`${check.ok ? "✓" : "✗"} ${check.slug}${shown ? ` (${shown})` : ""}: ${check.passed}/${check.total} passed`];
  if (check.compileError) {
    const e = check.compileError;
    lines.push(`    the code did not load: ${e.name}: ${e.message}${e.line ? ` (line ${e.line})` : ""}`);
    if (e.traceback) lines.push(indent(e.traceback, 6));
    return lines.join("\n");
  }
  for (const r of check.results) {
    if (r.pass) {
      lines.push(`    ✓ #${r.index + 1}  ${r.ms} ms`);
      continue;
    }
    if (r.error) {
      lines.push(`    ✗ #${r.index + 1}  ${r.error.name}: ${r.error.message}${r.error.line ? ` (line ${r.error.line})` : ""}`);
      if (r.traceback) lines.push(indent(r.traceback, 8));
    } else {
      lines.push(`    ✗ #${r.index + 1}  expected ${r.expected}, got ${r.received}`);
      if (r.reason) lines.push(`        ${r.reason}`);
    }
    lines.push(indent(`input:\n${indent(r.input, 2)}`, 8));
    if (r.logs.length) lines.push(indent(`output:\n${indent(r.logs.map((l) => l.text).join("\n"), 2)}`, 8));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------------------------------
// Command line

/**
 * @param {string} [msg]
 * @returns {never}
 */
function usage(msg) {
  if (msg) console.error(msg);
  console.error("usage: node scripts/dsa-lang-check.mjs <slug> --file my.py | --dir <folder> [slug…] | --script file.py\n       [--only 0,3] [--timeout ms] [--json]");
  process.exit(2);
}

/** @param {string[]} argv */
function main(argv) {
  /** @type {{ slugs: string[], json: boolean, file?: string, dir?: string, script?: string, indices?: number[], timeLimitMs?: number }} */
  const opts = { slugs: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => argv[++i] ?? usage(`${a} needs a value`);
    if (a === "--file") opts.file = value();
    else if (a === "--dir") opts.dir = value();
    else if (a === "--script") opts.script = value();
    else if (a === "--only") opts.indices = value().split(",").map((s) => Number(s.trim()));
    else if (a === "--timeout") opts.timeLimitMs = Number(value());
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") usage();
    else if (a.startsWith("--")) usage(`unknown option ${a}`);
    else opts.slugs.push(a);
  }

  if (opts.script) {
    const file = path.resolve(opts.script);
    const folder = path.dirname(file);
    const modules = Object.fromEntries(
      readdirSync(folder)
        .filter((f) => f.endsWith(".py") && !f.startsWith("test_") && path.join(folder, f) !== file)
        .map((f) => [f.slice(0, -3), readFileSync(path.join(folder, f), "utf8")]),
    );
    const run = runPythonScript(readFileSync(file, "utf8"), modules, { timeLimitMs: opts.timeLimitMs ?? 5000 });
    if (opts.json) console.log(JSON.stringify(run, null, 2));
    else {
      for (const l of run.logs) console.log(l.text);
      if (run.error) console.log(`\n${run.error.traceback || `${run.error.name}: ${run.error.message}`}`);
    }
    process.exit(run.error ? 1 : 0);
  }

  let jobs;
  if (opts.dir) {
    const dir = path.resolve(opts.dir);
    const files = readdirSync(dir).filter((f) => f.endsWith(".py")).sort();
    jobs = files.map((f) => ({ slug: f.slice(0, -3), file: path.join(dir, f) })).filter((j) => !opts.slugs.length || opts.slugs.includes(j.slug));
    if (!jobs.length) usage(`no matching .py files in ${opts.dir}`);
  } else if (opts.file) {
    if (opts.slugs.length !== 1) usage("--file needs exactly one problem slug");
    jobs = [{ slug: opts.slugs[0], file: path.resolve(opts.file) }];
  } else usage();

  const checks = [];
  for (const job of jobs) {
    const check = checkPython(loadProblem(job.slug), readFileSync(job.file, "utf8"), { indices: opts.indices, timeLimitMs: opts.timeLimitMs });
    checks.push(check);
    if (!opts.json) console.log(formatReport(check, job.file));
  }
  if (opts.json) console.log(JSON.stringify(checks, null, 2));
  else if (checks.length > 1) console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} files pass every test.`);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
