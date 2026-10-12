"use client";
import type { RunnableProblem } from "./schema";

export interface ErrorInfo {
  name: string;
  message: string;
  line: number | null;
}
export interface LogLine {
  level: "log" | "warn" | "error";
  text: string;
}
export interface TestResult {
  index: number;
  hidden: boolean;
  input: string;
  expected: string;
  received: string;
  pass: boolean;
  error: ErrorInfo | null;
  reason: string | null;
  logs: LogLine[];
  ms: number;
}
export interface RunOutcome {
  results: TestResult[];
  compileError: ErrorInfo | null;
  /** Index of the test that was running when the time limit hit. */
  timedOut: number | null;
  total: number;
}

const WORKER_URL = "/dsa-runner.js";

/**
 * Runs learner code in a fresh Web Worker. The timer resets after every finished test, so `timeoutMs` is a per-test
 * limit; when it fires the worker is terminated (that is how infinite loops are stopped).
 */
export function runTests(code: string, problem: RunnableProblem, indices: number[] | undefined, opts: { timeoutMs?: number; onResult?: (r: TestResult) => void } = {}) {
  const worker = new Worker(WORKER_URL);
  const limit = opts.timeoutMs ?? problem.timeoutMs ?? 3000;
  const results: TestResult[] = [];
  const total = (indices ?? problem.tests.map((_, i) => i)).length;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settle: (o: RunOutcome) => void = () => {};
  const promise = new Promise<RunOutcome>((resolve) => (settle = resolve));
  let compileError: ErrorInfo | null = null;

  const finish = (timedOut: number | null) => {
    clearTimeout(timer);
    worker.terminate();
    settle({ results, compileError, timedOut, total });
  };
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const list = indices ?? problem.tests.map((_, i) => i);
      finish(list[results.length] ?? -1);
    }, limit);
  };

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "result") {
      results.push(msg.result);
      opts.onResult?.(msg.result);
      arm();
    } else if (msg.type === "compile-error") {
      compileError = msg.error;
    } else if (msg.type === "done") {
      finish(null);
    }
  };
  worker.onerror = (e) => {
    e.preventDefault();
    compileError = { name: "Error", message: e.message || "The runner crashed.", line: null };
    finish(null);
  };
  arm();
  worker.postMessage({ type: "tests", code, problem, indices });
  return { promise, cancel: () => finish(null) };
}

export interface ScriptOutcome {
  logs: LogLine[];
  error: ErrorInfo | null;
  ms: number;
  timedOut: boolean;
}

/** Runs a snippet and collects console output (used by "Run" on cheat sheet and pattern code). */
export function runScript(code: string, timeoutMs = 4000): Promise<ScriptOutcome> {
  const worker = new Worker(WORKER_URL);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ logs: [], error: { name: "TimeoutError", message: `Stopped after ${timeoutMs / 1000}s: is there an infinite loop?`, line: null }, ms: timeoutMs, timedOut: true });
    }, timeoutMs);
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type !== "script-done") return;
      clearTimeout(timer);
      worker.terminate();
      resolve({ logs: e.data.logs, error: e.data.error, ms: e.data.ms, timedOut: false });
    };
    worker.onerror = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      worker.terminate();
      resolve({ logs: [], error: { name: "Error", message: e.message, line: null }, ms: 0, timedOut: false });
    };
    worker.postMessage({ type: "script", code });
  });
}
