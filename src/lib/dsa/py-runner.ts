"use client";
// Runs Python in the browser through public/dsa-runner-py.js (Pyodide in a Web Worker). One worker is kept warm for
// the whole visit: the first run downloads Python (about 5 MB, then cached by the browser); later runs start at once.
// A test that runs too long gets the worker terminated, and the next run starts a fresh one.
import { useSyncExternalStore } from "react";
import type { RunnableProblem } from "./schema";
import type { ErrorInfo, RunOutcome, ScriptOutcome, TestResult } from "./runner";

export const PY_WORKER_URL = "/dsa-runner-py.js";
/** Python is slower than JavaScript, so a test gets twice the JavaScript limit. */
export const PY_TIME_FACTOR = 2;
/** Give up on loading when nothing arrives for this long (a stalled download). */
const STALL_MS = 45_000;

export type PyPhase = "idle" | "loading" | "starting" | "ready" | "error";
export interface PyStatus {
  phase: PyPhase;
  /** Download progress in bytes (after decompression), while loading. */
  loaded: number;
  total: number;
  /** Why Python is unavailable, when phase is "error". */
  error: string | null;
  /** True once this visit has loaded Python before: a reload after a time limit is a restart, not a download. */
  restarting: boolean;
}

const IDLE: PyStatus = { phase: "idle", loaded: 0, total: 0, error: null, restarting: false };
let status: PyStatus = IDLE;
const listeners = new Set<() => void>();
function setStatus(patch: Partial<PyStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const getPythonStatus = () => status;
/** Live loading status for progress UI. The server render always sees "idle". */
export function usePythonStatus(): PyStatus {
  return useSyncExternalStore(subscribe, getPythonStatus, () => IDLE);
}

let worker: Worker | null = null;
let booting: Promise<Worker> | null = null;
let everReady = false;

function kill() {
  worker?.terminate();
  worker = null;
  booting = null;
}

/** Thrown (and shown) when Python can't load: offline, CDN blocked, or an old browser. */
export class PythonUnavailable extends Error {}

/** Starts Python if it isn't running. Resolves with the ready worker; safe to call repeatedly (e.g. to preload). */
export function bootPython(): Promise<Worker> {
  if (booting) return booting;
  if (typeof Worker === "undefined") return Promise.reject(new PythonUnavailable("This browser can't run Python here (no Web Workers)."));
  const w = new Worker(PY_WORKER_URL);
  worker = w;
  setStatus({ phase: "loading", loaded: 0, total: 0, error: null, restarting: everReady });
  const p = new Promise<Worker>((resolve, reject) => {
    let stall: ReturnType<typeof setTimeout> | undefined;
    const fail = (message: string) => {
      clearTimeout(stall);
      if (worker === w) kill();
      else w.terminate();
      setStatus({ phase: "error", error: message });
      reject(new PythonUnavailable(message));
    };
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => fail("Python took too long to download. Check your connection and run again. JavaScript works offline."), STALL_MS);
    };
    arm();
    w.onmessage = (e: MessageEvent) => {
      const m = e.data;
      arm();
      if (m.type === "progress") setStatus({ phase: "loading", loaded: m.loaded, total: m.total });
      else if (m.type === "starting") setStatus({ phase: "starting" });
      else if (m.type === "ready") {
        clearTimeout(stall);
        everReady = true;
        setStatus({ phase: "ready", error: null });
        resolve(w);
      } else if (m.type === "init-error") fail(m.message);
    };
    w.onerror = (e) => {
      e.preventDefault();
      fail(e.message || "Python couldn't start.");
    };
  });
  booting = p;
  p.catch(() => {});
  w.postMessage({ type: "init" });
  return p;
}

// One run at a time: a page with several runnable snippets queues them on the single worker.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => {});
  return next;
}

/** Restarts after the run: a crashed or stopped interpreter isn't reused. */
function retire(w: Worker) {
  if (worker === w) kill();
  else w.terminate();
  setStatus({ phase: "idle" });
}

export interface PyRunOutcome extends RunOutcome {
  /** Set when Python couldn't load: nothing ran, so the run must not count as a submission. */
  unavailable?: string;
}

/** Like runTests in runner.ts, for Python code. The per-test limit starts once Python is ready, not while it loads. */
export function runTestsPy(code: string, problem: RunnableProblem, indices: number[] | undefined, opts: { timeoutMs?: number; onResult?: (r: TestResult) => void } = {}) {
  const list = indices ?? problem.tests.map((_, i) => i);
  const total = list.length;
  const limit = opts.timeoutMs ?? (problem.timeoutMs ?? 3000) * PY_TIME_FACTOR;
  const promise = enqueue(async (): Promise<PyRunOutcome> => {
    let w: Worker;
    try {
      w = await bootPython();
    } catch (err) {
      return { results: [], compileError: null, timedOut: null, total, unavailable: (err as Error).message };
    }
    return new Promise<PyRunOutcome>((resolve) => {
      const results: TestResult[] = [];
      let compileError: ErrorInfo | null = null;
      let broken = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (timedOut: number | null) => {
        clearTimeout(timer);
        if (timedOut !== null || broken) retire(w);
        resolve({ results, compileError, timedOut, total });
      };
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => finish(list[results.length] ?? -1), limit);
      };
      w.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "result") {
          results.push(m.result);
          opts.onResult?.(m.result);
          arm();
        } else if (m.type === "compile-error") compileError = m.error;
        else if (m.type === "broken") broken = true;
        else if (m.type === "done") finish(null);
        else if (m.type === "init-error") {
          compileError = { name: "PythonError", message: m.message, line: null };
          broken = true;
          finish(null);
        }
      };
      w.onerror = (e) => {
        e.preventDefault();
        compileError = { name: "Error", message: e.message || "The Python runner crashed.", line: null };
        broken = true;
        finish(null);
      };
      arm();
      w.postMessage({ type: "tests", code, problem, indices });
    });
  });
  return { promise };
}

export interface PyScriptOutcome extends ScriptOutcome {
  unavailable?: string;
}

/** Runs a Python snippet and collects its output. `modules` maps a module name to its source (sibling templates). */
export function runScriptPy(code: string, modules: Record<string, string> = {}, timeoutMs = 8000): Promise<PyScriptOutcome> {
  return enqueue(async () => {
    let w: Worker;
    try {
      w = await bootPython();
    } catch (err) {
      const message = (err as Error).message;
      return { logs: [], error: { name: "PythonUnavailable", message, line: null }, ms: 0, timedOut: false, unavailable: message };
    }
    return new Promise<PyScriptOutcome>((resolve) => {
      let broken = false;
      const timer = setTimeout(() => {
        retire(w);
        resolve({ logs: [], error: { name: "TimeoutError", message: `Stopped after ${timeoutMs / 1000}s: is there an infinite loop?`, line: null }, ms: timeoutMs, timedOut: true });
      }, timeoutMs);
      w.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "broken") broken = true;
        if (m.type !== "script-done") return;
        clearTimeout(timer);
        if (broken) retire(w);
        resolve({ logs: m.logs, error: m.error, ms: m.ms, timedOut: false });
      };
      w.onerror = (e) => {
        e.preventDefault();
        clearTimeout(timer);
        retire(w);
        resolve({ logs: [], error: { name: "Error", message: e.message || "The Python runner crashed.", line: null }, ms: 0, timedOut: false });
      };
      w.postMessage({ type: "script", code, modules });
    });
  });
}
