/*
 * Python runner: a Web Worker that runs learner Python with Pyodide (CPython compiled to WebAssembly).
 *
 *   page → worker  { type: "init" }                                  load Pyodide and the harness (once per worker)
 *                  { type: "tests", code, problem, indices }         run tests
 *                  { type: "script", code, modules }                 run a snippet; modules = { module_name: source }
 *   worker → page  { type: "progress", loaded, total }               download progress (bytes after decompression)
 *                  { type: "starting" } / { type: "ready" }          Python is starting / ready
 *                  { type: "init-error", message }                   Pyodide or the harness could not load
 *                  { type: "start" }, { type: "result", result }, { type: "compile-error", error }, { type: "done" }
 *                                                                    the same test protocol as dsa-runner.js
 *                  { type: "script-done", logs, error, ms }
 *                  { type: "broken" }                                Python crashed: the page should start a new worker
 *
 * The Python harness (/dsa-runner.py) turns test inputs into Python values (ListNode, TreeNode…), calls the learner's
 * code and returns plain JSON results. Judging stays here and uses the JavaScript runner's own functions
 * (/dsa-runner.js: compareValues, show), so Python and JavaScript answers are checked by exactly the same rules.
 *
 * The page keeps one worker warm while it is open. A test that runs too long can't be interrupted from inside
 * WebAssembly, so the page terminates the worker and starts a new one on the next run (Pyodide then comes from the
 * browser cache). Plain ES2020, no imports: this file is served as is.
 */
(function (root) {
  "use strict";

  var PYODIDE_VERSION = "0.28.3";
  var BASE = "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/";
  // Sizes after decompression of the files loadPyodide fetches for this pinned version (about 5 MB over the wire).
  var FILES = { "pyodide.asm.wasm": 8645967, "python_stdlib.zip": 2416866, "pyodide.asm.js": 1073033, "pyodide-lock.json": 109732 };

  // The JavaScript runner: its compareValues and show judge Python answers too. Loading it installs its own
  // onmessage, which is replaced at the end of this file.
  root.importScripts("/dsa-runner.js");
  var H = root.__dsaHarness;
  var post = root.postMessage.bind(root);

  var runner = null; // the dsa_runner module (a PyProxy) once ready
  var initPromise = null;

  // The harness tags non-finite floats as {"$num": "Infinity"} because JSON has no Infinity or NaN.
  function parse(text) {
    return JSON.parse(text, function (_, v) {
      return v && typeof v === "object" && typeof v.$num === "string" ? Number(v.$num) : v;
    });
  }

  // ---------------------------------------------------------------- loading
  /** Fetches Pyodide's big files with progress. loadPyodide then gets them from the HTTP cache (they are immutable). */
  function prefetch() {
    var names = Object.keys(FILES);
    var total = names.reduce(function (n, f) {
      return n + FILES[f];
    }, 0);
    var loaded = 0;
    var last = 0;
    post({ type: "progress", loaded: 0, total: total });
    return Promise.all(
      names.map(function (f) {
        return fetch(BASE + f).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " for " + f);
          if (!res.body || !res.body.getReader) return res.arrayBuffer();
          var reader = res.body.getReader();
          function pump() {
            return reader.read().then(function (step) {
              if (step.done) return;
              loaded += step.value.length;
              if (loaded - last > 200000) {
                last = loaded;
                post({ type: "progress", loaded: Math.min(loaded, total), total: total });
              }
              return pump();
            });
          }
          return pump();
        });
      }),
    ).then(function () {
      post({ type: "progress", loaded: total, total: total });
    });
  }

  function offline() {
    return new Error("Python couldn't be downloaded from cdn.jsdelivr.net. Check your connection and run again. JavaScript works offline.");
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = (async function () {
      try {
        if (typeof root.loadPyodide !== "function") root.importScripts(BASE + "pyodide.js");
        await prefetch();
      } catch {
        throw offline();
      }
      post({ type: "starting" });
      var py;
      try {
        py = await root.loadPyodide({ indexURL: BASE });
      } catch (err) {
        throw new Error("Python couldn't start in this browser: " + ((err && err.message) || err));
      }
      // The harness captures print() itself; anything else (Pyodide warnings) goes to the browser console.
      py.setStdout({ batched: function (s) { console.log(s); } });
      py.setStderr({ batched: function (s) { console.warn(s); } });
      var res = await fetch("/dsa-runner.py");
      if (!res.ok) throw new Error("The Python test harness couldn't be loaded (HTTP " + res.status + "). Reload the page and try again.");
      py.FS.mkdirTree("/home/pyodide");
      py.FS.writeFile("/home/pyodide/dsa_runner.py", await res.text());
      py.runPython("import sys\nif '/home/pyodide' not in sys.path:\n    sys.path.insert(0, '/home/pyodide')");
      runner = py.pyimport("dsa_runner");
    })();
    initPromise.catch(function () {
      initPromise = null;
    });
    return initPromise;
  }

  // ---------------------------------------------------------------- judging (same result shape as dsa-runner.js)
  function describeInput(problem, test) {
    if (problem.kind === "design") return H.show(test.ops) + "\n" + H.show(test.args);
    var names = problem.params || [];
    return test.args
      .map(function (a, i) {
        return (names[i] || "arg" + i) + " = " + H.show(a);
      })
      .join("\n");
  }

  /** Python method names: getMin → get_min (the harness's snake_case). */
  function snake(name) {
    return name
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase();
  }

  function makeValidator(src) {
    if (!src) return null;
    return new Function('"use strict"; return (' + src + ");")();
  }

  function errorOf(e) {
    if (!e) return null;
    return { name: e.name || "Error", message: e.message || "", line: typeof e.line === "number" && e.line > 0 ? e.line : null, traceback: e.traceback || null };
  }

  function judge(problem, run, validator) {
    var index = run.index;
    var test = problem.tests[index];
    var out = {
      index: index,
      hidden: index >= (problem.samples || 3),
      input: describeInput(problem, test),
      expected: H.show(test.expected),
      received: "",
      pass: false,
      error: errorOf(run.error),
      reason: null,
      logs: run.logs || [],
      ms: run.ms || 0,
    };
    if (out.error) return out;
    var actual = run.actual === undefined ? null : run.actual;
    try {
      if (problem.kind === "design") {
        var mode = problem.compare === "float" ? "float" : "exact";
        var outputs = Array.isArray(actual) ? actual : [];
        // An expected null marks a void call (constructor, push…): like LeetCode, its return value isn't checked.
        var bad = -1;
        for (var i = 0; i < outputs.length && bad === -1; i++) {
          if (test.expected[i] !== null && !H.compareValues(outputs[i], test.expected[i], mode)) bad = i;
        }
        out.pass = bad === -1 && outputs.length === test.expected.length;
        if (!out.pass && bad !== -1)
          out.reason = "Call " + (bad + 1) + ", " + snake(test.ops[bad]) + "(" + (test.args[bad] || []).map(H.show).join(", ") + "): expected " + H.show(test.expected[bad]) + ", got " + H.show(outputs[bad]) + ".";
      } else if (validator) {
        var verdict = validator(actual, JSON.parse(JSON.stringify(test.args)), test.expected === undefined ? undefined : JSON.parse(JSON.stringify(test.expected)));
        out.pass = verdict === true;
        if (!out.pass) out.reason = typeof verdict === "string" ? verdict : "That answer does not satisfy the requirements.";
      } else {
        out.pass = H.compareValues(actual, test.expected, problem.compare || "exact");
      }
      out.received = H.show(actual);
    } catch (e) {
      out.error = { name: e.name || "Error", message: e.message || String(e), line: null, traceback: null };
    }
    return out;
  }

  /** An exception that escaped the harness: a crash inside Pyodide (e.g. the WebAssembly stack ran out). */
  function crash(err) {
    var text = String((err && err.message) || err);
    if (/call stack|too much recursion/i.test(text)) return { name: "RecursionError", message: "The recursion went too deep for the browser. Use an explicit stack, or recurse less deeply.", line: null, traceback: null };
    var lines = text.trim().split("\n");
    return { name: "PythonError", message: lines[lines.length - 1] || text, line: null, traceback: null };
  }

  function runTests(msg) {
    var problem = msg.problem;
    var validator;
    try {
      validator = makeValidator(problem.validate);
    } catch (err) {
      post({ type: "compile-error", error: { name: "ProblemError", message: "Broken validator: " + err.message, line: null } });
      return;
    }
    var onResult = function (json) {
      // Posted as each test finishes, so the page's per-test timer knows which test is running.
      post({ type: "result", result: judge(problem, parse(String(json)), validator) });
    };
    try {
      var outcome = parse(runner.run_problem_json(JSON.stringify(problem), msg.code, JSON.stringify(msg.indices || null), onResult));
      if (outcome.compileError) post({ type: "compile-error", error: errorOf(outcome.compileError) });
    } catch (err) {
      post({ type: "compile-error", error: crash(err) });
      post({ type: "broken" });
    }
  }

  function runScript(msg) {
    var started = performance.now();
    try {
      var run = parse(runner.run_script_json(msg.code, JSON.stringify(msg.modules || {})));
      post({ type: "script-done", logs: run.logs || [], error: errorOf(run.error), ms: run.ms || 0 });
    } catch (err) {
      post({ type: "broken" });
      post({ type: "script-done", logs: [], error: crash(err), ms: Math.round(performance.now() - started) });
    }
  }

  // ---------------------------------------------------------------- worker protocol
  function failed(err) {
    post({ type: "init-error", message: (err && err.message) || String(err) });
  }
  root.onmessage = function (e) {
    var msg = e.data || {};
    if (msg.type === "init") {
      init().then(function () {
        post({ type: "ready" });
      }, failed);
    } else if (msg.type === "tests") {
      init().then(function () {
        post({ type: "start", total: (msg.indices || msg.problem.tests).length });
        runTests(msg);
        post({ type: "done" });
      }, failed);
    } else if (msg.type === "script") {
      init().then(function () {
        runScript(msg);
      }, failed);
    }
  };
})(self);
