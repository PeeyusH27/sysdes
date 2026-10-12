/*
 * DSA code runner. Runs learner code against a problem's test cases, or runs a snippet and captures console output.
 *
 * In the browser it is loaded as a Web Worker (new Worker("/dsa-runner.js")), so an infinite loop only freezes the
 * worker, which the page terminates after a timeout. In tests it is evaluated directly and exposes
 * globalThis.__dsaHarness, so reference solutions are checked by exactly the same code learners run against.
 *
 * Plain ES2020, no imports: this file is served as is.
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ data structures given to learner code
  class ListNode {
    constructor(val = 0, next = null) {
      this.val = val;
      this.next = next;
    }
  }
  class TreeNode {
    constructor(val = 0, left = null, right = null) {
      this.val = val;
      this.left = left;
      this.right = right;
    }
  }

  const MAX_NODES = 100000;
  const MAX_LOG_LINES = 200;
  const MAX_TEXT = 4000;

  const clone = (v) => (v === undefined ? undefined : typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

  function toList(values) {
    const dummy = new ListNode();
    let tail = dummy;
    for (const v of values || []) {
      tail.next = new ListNode(v);
      tail = tail.next;
    }
    return dummy.next;
  }

  /** [values, pos]: the tail links back to the node at index pos (-1 = no cycle). */
  function toCycleList(spec) {
    const [values, pos] = spec;
    const head = toList(values);
    if (!head || pos < 0) return head;
    let entry = null;
    let tail = head;
    for (let i = 0; ; i++) {
      if (i === pos) entry = tail;
      if (!tail.next) break;
      tail = tail.next;
    }
    tail.next = entry;
    return head;
  }

  function fromList(head) {
    const out = [];
    const seen = new Set();
    for (let n = head; n; n = n.next) {
      if (seen.has(n) || out.length >= MAX_NODES) {
        out.push("…cycle");
        break;
      }
      seen.add(n);
      out.push(n.val);
    }
    return out;
  }

  /** Level order with nulls for missing children, e.g. [3, 9, 20, null, null, 15, 7]. */
  function toTree(values) {
    if (!values || !values.length || values[0] === null) return null;
    const rootNode = new TreeNode(values[0]);
    const queue = [rootNode];
    let head = 0;
    let i = 1;
    while (head < queue.length && i < values.length) {
      const node = queue[head++];
      if (i < values.length && values[i] !== null) queue.push((node.left = new TreeNode(values[i])));
      i++;
      if (i < values.length && values[i] !== null) queue.push((node.right = new TreeNode(values[i])));
      i++;
    }
    return rootNode;
  }

  function fromTree(rootNode) {
    if (!rootNode) return [];
    const out = [];
    const queue = [rootNode];
    const seen = new Set();
    for (let head = 0; head < queue.length && out.length < MAX_NODES; head++) {
      const node = queue[head];
      if (node === null || node === undefined) {
        out.push(null);
        continue;
      }
      if (seen.has(node)) {
        out.push("…cycle");
        break;
      }
      seen.add(node);
      out.push(node.val);
      queue.push(node.left ?? null, node.right ?? null);
    }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }

  // ------------------------------------------------------------------ conversions
  function convertArg(value, type) {
    switch (type) {
      case "list":
        return toList(value);
      case "tree":
        return toTree(value);
      case "list-cycle":
        return toCycleList(value);
      case "list[]":
        return value.map(toList);
      default:
        return clone(value);
    }
  }

  /** Learner return value → plain JSON-like data for comparison and display. */
  function toPlain(v, type) {
    if (type === "list") return fromList(v);
    if (type === "tree") return fromTree(v);
    if (type === "node-val") return v === null || v === undefined ? null : v.val;
    return plain(v, 0);
  }

  function plain(v, depth) {
    if (v === undefined) return null;
    if (v instanceof ListNode) return fromList(v);
    if (v instanceof TreeNode) return fromTree(v);
    if (depth > 50 || v === null || typeof v !== "object") return v;
    if (ArrayBuffer.isView(v)) return Array.from(v);
    if (Array.isArray(v)) return v.map((x) => plain(x, depth + 1));
    return v;
  }

  // ------------------------------------------------------------------ comparison
  function canon(v) {
    return JSON.stringify(v, (_, x) => {
      if (x && typeof x === "object" && !Array.isArray(x)) return Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
      if (typeof x === "number" && !Number.isFinite(x)) return String(x);
      return x;
    });
  }

  function unorder(v, deep) {
    if (!Array.isArray(v)) return v;
    const items = deep ? v.map((x) => unorder(x, true)) : v.slice();
    return items
      .map((x) => [canon(x), x])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map((p) => p[1]);
  }

  function equal(a, b, tol) {
    if (typeof a === "number" && typeof b === "number") {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      if (tol) return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
      return a === b;
    }
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) return (a === null || a === undefined) && (b === null || b === undefined);
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i], tol)) return false;
      return true;
    }
    if (typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a).filter((k) => a[k] !== undefined);
      const kb = Object.keys(b).filter((k) => b[k] !== undefined);
      if (ka.length !== kb.length) return false;
      return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && equal(a[k], b[k], tol));
    }
    return false;
  }

  function compareValues(actual, expected, mode) {
    const tol = mode === "float" ? 1e-5 : 0;
    if (mode === "unordered") return equal(unorder(actual, false), unorder(expected, false), tol);
    if (mode === "deep-unordered") return equal(unorder(actual, true), unorder(expected, true), tol);
    return equal(actual, expected, tol);
  }

  // ------------------------------------------------------------------ formatting
  const clip = (s) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}… (${s.length - MAX_TEXT} more characters)` : s);

  /** Compact JSON-like text for inputs, expected and actual values. */
  function show(v) {
    return clip(showInner(v, 0));
  }
  function showInner(v, depth) {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "number") return Object.is(v, -0) ? "0" : String(v);
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "boolean") return String(v);
    if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`;
    if (depth > 8) return "…";
    if (v instanceof ListNode) return `${showInner(fromList(v), depth)} (linked list)`;
    if (v instanceof TreeNode) return `${showInner(fromTree(v), depth)} (tree)`;
    if (Array.isArray(v)) return `[${v.map((x) => showInner(x, depth + 1)).join(",")}]`;
    if (v instanceof Map) return `Map {${[...v].map(([k, x]) => `${showInner(k, depth + 1)} => ${showInner(x, depth + 1)}`).join(", ")}}`;
    if (v instanceof Set) return `Set {${[...v].map((x) => showInner(x, depth + 1)).join(", ")}}`;
    if (ArrayBuffer.isView(v)) return `[${Array.from(v).join(",")}]`;
    return `{${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)}:${showInner(x, depth + 1)}`)
      .join(",")}}`;
  }

  /** console.log formatting, close to what Node prints. */
  function inspect(v, depth = 0, seen = new Set()) {
    const nested = depth > 0;
    if (typeof v === "string") return nested ? `'${v}'` : v;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "number") return Object.is(v, -0) ? "-0" : String(v);
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "boolean" || typeof v === "symbol") return String(v);
    if (typeof v === "function") return /^class\s/.test(Function.prototype.toString.call(v)) ? `[class ${v.name}]` : `[Function: ${v.name || "(anonymous)"}]`;
    if (seen.has(v)) return "[Circular]";
    if (v instanceof Error) return v.stack ? String(v.stack).split("\n")[0] : `${v.name}: ${v.message}`;
    if (v instanceof ListNode) return `ListNode(${fromList(v).map((x) => inspect(x, 1)).join(" → ")})`;
    if (v instanceof TreeNode) return `TreeNode(${inspect(fromTree(v), 1)})`;
    if (depth > 3) return Array.isArray(v) ? "[Array]" : "[Object]";
    seen.add(v);
    try {
      if (Array.isArray(v) || ArrayBuffer.isView(v)) {
        const arr = Array.from(v);
        const shown = arr.slice(0, 100).map((x, i) => (Array.isArray(v) && !(i in v) ? "<empty>" : inspect(x, depth + 1, seen)));
        if (arr.length > 100) shown.push(`... ${arr.length - 100} more items`);
        const prefix = ArrayBuffer.isView(v) ? `${v.constructor.name}(${arr.length}) ` : "";
        return `${prefix}[${shown.join(", ")}]`;
      }
      if (v instanceof Map) return `Map(${v.size}) {${v.size ? ` ${[...v].slice(0, 100).map(([k, x]) => `${inspect(k, depth + 1, seen)} => ${inspect(x, depth + 1, seen)}`).join(", ")} ` : ""}}`;
      if (v instanceof Set) return `Set(${v.size}) {${v.size ? ` ${[...v].slice(0, 100).map((x) => inspect(x, depth + 1, seen)).join(", ")} ` : ""}}`;
      const name = v.constructor && v.constructor !== Object && v.constructor.name ? `${v.constructor.name} ` : "";
      const entries = Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${inspect(x, depth + 1, seen)}`);
      return entries.length ? `${name}{ ${entries.join(", ")} }` : `${name}{}`;
    } finally {
      seen.delete(v);
    }
  }

  // ------------------------------------------------------------------ console capture
  function captureConsole() {
    const logs = [];
    let chars = 0;
    const original = {};
    const push = (level, args) => {
      if (logs.length >= MAX_LOG_LINES) {
        if (logs.length === MAX_LOG_LINES) logs.push({ level: "warn", text: `… output truncated after ${MAX_LOG_LINES} lines` });
        return;
      }
      const text = clip(args.map((a) => inspect(a)).join(" "));
      chars += text.length;
      logs.push({ level, text });
    };
    for (const level of ["log", "info", "warn", "error", "debug", "table", "dir"]) {
      original[level] = root.console[level];
      root.console[level] = (...args) => push(level === "table" || level === "dir" || level === "debug" || level === "info" ? "log" : level, args);
    }
    return {
      logs,
      restore() {
        for (const level of Object.keys(original)) root.console[level] = original[level];
      },
      size: () => chars,
    };
  }

  // ------------------------------------------------------------------ errors
  // new Function(a, b, body) compiles "function anonymous(a,b\n) {\n<body>\n}": the body starts on line 3.
  const BODY_OFFSET = 2;
  function errorInfo(err) {
    const e = err instanceof Error ? err : new Error(String(err));
    const stack = String(e.stack || "");
    const m = /<anonymous>:(\d+):(\d+)/.exec(stack) || /> Function:(\d+):(\d+)/.exec(stack) || /eval code:(\d+):(\d+)/.exec(stack);
    const line = m ? Number(m[1]) - BODY_OFFSET : null;
    return { name: e.name || "Error", message: e.message || String(err), line: line && line > 0 ? line : null };
  }

  // Learner code runs inside an inner function so it may declare its own ListNode/TreeNode (a common habit) without
  // clashing with the provided ones. The prefix sits on the first line, so line numbers stay aligned.
  function compile(code, name) {
    const body = `"use strict";return (function () {${code}\n;return (typeof ${name} !== "undefined") ? ${name} : undefined;})();`;
    const factory = new Function("ListNode", "TreeNode", body);
    const target = factory(ListNode, TreeNode);
    if (typeof target !== "function") throw new ReferenceError(`Define a ${/^[A-Z]/.test(name) ? "class" : "function"} named ${name}.`);
    return target;
  }

  // ------------------------------------------------------------------ test runs
  function describeInput(problem, test) {
    if (problem.kind === "design") return `${show(test.ops)}\n${show(test.args)}`;
    const names = problem.params || [];
    return test.args.map((a, i) => `${names[i] || `arg${i}`} = ${show(a)}`).join("\n");
  }

  function makeValidator(src) {
    if (!src) return null;
    return new Function(`"use strict"; return (${src});`)();
  }

  function runOne(problem, target, test, index, validator) {
    const capture = captureConsole();
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const out = {
      index,
      hidden: index >= (problem.samples || 3),
      input: describeInput(problem, test),
      expected: show(test.expected),
      received: "",
      pass: false,
      error: null,
      reason: null,
      logs: capture.logs,
      ms: 0,
    };
    try {
      let actual;
      if (problem.kind === "design") {
        const outputs = [];
        let obj = null;
        for (let i = 0; i < test.ops.length; i++) {
          const op = test.ops[i];
          const args = clone(test.args[i] || []);
          if (i === 0) {
            obj = new target(...args);
            outputs.push(null);
            continue;
          }
          if (typeof obj[op] !== "function") throw new TypeError(`${problem.className}.${op} is not a function`);
          outputs.push(plain(obj[op](...args), 0));
        }
        actual = outputs;
        const tol = problem.compare === "float" ? 1e-5 : 0;
        // An expected null marks a void call (constructor, push, pop…): like LeetCode, its return value isn't checked.
        const bad = outputs.findIndex((v, i) => test.expected[i] !== null && !equal(v, test.expected[i], tol));
        out.pass = bad === -1 && outputs.length === test.expected.length;
        if (!out.pass && bad !== -1) out.reason = `Call ${bad + 1}, ${test.ops[bad]}(${(test.args[bad] || []).map(show).join(", ")}): expected ${show(test.expected[bad])}, got ${show(outputs[bad])}.`;
      } else {
        const io = problem.io || {};
        const types = io.args || [];
        const args = test.args.map((a, i) => convertArg(a, types[i]));
        const ret = target(...args);
        actual = problem.inPlace !== undefined ? toPlain(args[problem.inPlace], types[problem.inPlace] === "list" || types[problem.inPlace] === "tree" ? types[problem.inPlace] : undefined) : toPlain(ret, io.returns);
        if (validator) {
          const verdict = validator(actual, clone(test.args), clone(test.expected));
          out.pass = verdict === true;
          if (!out.pass) out.reason = typeof verdict === "string" ? verdict : "That answer does not satisfy the requirements.";
        } else {
          out.pass = compareValues(actual, test.expected, problem.compare || "exact");
        }
      }
      out.received = show(actual);
    } catch (err) {
      out.error = errorInfo(err);
      out.received = "";
    } finally {
      capture.restore();
      out.ms = Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - started) * 100) / 100;
    }
    return out;
  }

  /**
   * Runs the tests at `indices` (default: all). Returns { compileError, results }.
   * `onResult` streams each result as soon as it is ready (the worker posts it, so a timeout knows where it hung).
   */
  function runTests(code, problem, indices, onResult) {
    const name = problem.kind === "design" ? problem.className : problem.fn;
    let target;
    try {
      target = compile(code, name);
    } catch (err) {
      return { compileError: errorInfo(err), results: [] };
    }
    let validator = null;
    try {
      validator = makeValidator(problem.validate);
    } catch (err) {
      return { compileError: { name: "ProblemError", message: `Broken validator: ${errorInfo(err).message}`, line: null }, results: [] };
    }
    const list = indices || problem.tests.map((_, i) => i);
    const results = [];
    for (const i of list) {
      const r = runOne(problem, target, problem.tests[i], i, validator);
      results.push(r);
      if (onResult) onResult(r);
    }
    return { compileError: null, results };
  }

  // ------------------------------------------------------------------ snippets (cheat sheet "Run")
  /** Runs a script and resolves with its console output once timers settle (or after maxWaitMs). */
  async function runScript(code, maxWaitMs = 1500) {
    const capture = captureConsole();
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    let pending = 0;
    const realSet = root.setTimeout;
    const realClear = root.clearTimeout;
    const ids = new Set();
    root.setTimeout = (fn, ms, ...rest) => {
      pending++;
      const id = realSet(() => {
        ids.delete(id);
        pending--;
        try {
          if (typeof fn === "function") fn(...rest);
        } catch (err) {
          const info = errorInfo(err);
          capture.logs.push({ level: "error", text: `Uncaught ${info.name}: ${info.message}` });
        }
      }, ms);
      ids.add(id);
      return id;
    };
    root.clearTimeout = (id) => {
      if (ids.delete(id)) pending--;
      realClear(id);
    };
    let error = null;
    const onRejection = (e) => {
      const info = errorInfo(e && e.reason !== undefined ? e.reason : e);
      capture.logs.push({ level: "error", text: `Uncaught (in promise) ${info.name}: ${info.message}` });
      if (e && typeof e.preventDefault === "function") e.preventDefault();
    };
    const canListen = typeof root.addEventListener === "function";
    if (canListen) root.addEventListener("unhandledrejection", onRejection);
    try {
      const fn = new Function("ListNode", "TreeNode", `"use strict";(function () {${code}\n})();`);
      fn(ListNode, TreeNode);
    } catch (err) {
      error = errorInfo(err);
    }
    const deadline = Date.now() + maxWaitMs;
    await new Promise((r) => realSet(r, 0));
    while (pending > 0 && Date.now() < deadline) await new Promise((r) => realSet(r, 10));
    for (const id of ids) realClear(id);
    root.setTimeout = realSet;
    root.clearTimeout = realClear;
    if (canListen) root.removeEventListener("unhandledrejection", onRejection);
    capture.restore();
    const ms = Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - started) * 100) / 100;
    return { logs: capture.logs, error, ms };
  }

  const api = { runTests, runScript, compareValues, inspect, show, toList, fromList, toTree, fromTree, toCycleList, ListNode, TreeNode };
  root.__dsaHarness = api;

  // ------------------------------------------------------------------ worker protocol
  const isWorker = typeof root.WorkerGlobalScope !== "undefined" && root instanceof root.WorkerGlobalScope;
  if (isWorker) {
    const post = root.postMessage.bind(root);
    root.onmessage = async (e) => {
      const msg = e.data || {};
      if (msg.type === "tests") {
        post({ type: "start", total: (msg.indices || msg.problem.tests).length });
        const { compileError } = runTests(msg.code, msg.problem, msg.indices, (r) => post({ type: "result", result: r }));
        if (compileError) post({ type: "compile-error", error: compileError });
        post({ type: "done" });
      } else if (msg.type === "script") {
        const out = await runScript(msg.code, msg.maxWaitMs);
        post({ type: "script-done", ...out });
      }
    };
  }
})(typeof self !== "undefined" ? self : globalThis);
