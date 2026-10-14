"""
Python runner for the DSA practice IDE: runs learner code against a problem's tests, or runs a snippet and captures
its output. The Python counterpart of public/dsa-runner.js.

In the browser, a worker loads this file into Pyodide (WebAssembly CPython), e.g.

    pyodide.FS.writeFile("dsa_runner.py", await (await fetch("/dsa-runner.py")).text());
    const runner = pyodide.pyimport("dsa_runner");
    const outcome = JSON.parse(runner.run_problem_json(JSON.stringify(problem), code, null, onResultJson), revive);

Locally, CPython runs it through the command line at the bottom (scripts/dsa-lang-check.mjs and the vitest suite use
that). The core API below touches no files, processes or threads, so both hosts behave the same.

This file only *runs* code. Judging stays in JavaScript: the caller compares `actual` with the test's `expected`
using the same compareValues / validator code as the JS runner, so every language is held to identical rules.

Public API (JSON-able values everywhere):

    run_problem(problem, code, indices=None, on_result=None, time_limit_ms=None)
        -> {"compileError": ErrorInfo | None, "results": [TestRun, ...]}
    run_problem_json(problem_json, code, indices_json=None, on_result=None, time_limit_ms=None) -> str (JSON)
    run_script(code, modules=None, time_limit_ms=None) -> ScriptRun
    run_script_json(code, modules_json=None, time_limit_ms=None) -> str (JSON)

    TestRun   = {"index", "actual", "error", "logs", "stdout", "ms"}   (+ "stopped": True after KeyboardInterrupt)
    ScriptRun = {"error", "logs", "stdout", "ms"}
    ErrorInfo = {"name", "message", "line", "traceback"}   (line: 1-based line in the learner's code, or None)
    LogLine   = {"level": "log" | "error" | "warn", "text"}  (print() is "log", writes to sys.stderr are "error")

JSON text from the *_json functions writes non-finite floats as {"$num": "Infinity" | "-Infinity" | "NaN"};
revive them with JSON.parse(text, (k, v) => (v && typeof v.$num === "string" ? Number(v.$num) : v)).

Must run on CPython 3.9 (local checks) and on Pyodide's newer CPython: no match statements, no `X | Y` at runtime.
"""
from __future__ import annotations

import builtins
import contextlib
import copy
import importlib.abc
import importlib.util
import itertools
import json
import linecache
import math
import numbers
import re
import sys
import time
import traceback
import typing
from typing import Any, Callable, Dict, Iterator, List, Optional, Tuple

__all__ = [
    "ListNode",
    "TreeNode",
    "run_problem",
    "run_problem_json",
    "run_script",
    "run_script_json",
    "snake_case",
    "to_list",
    "to_cycle_list",
    "to_tree",
    "from_list",
    "from_tree",
    "plain",
    "dumps",
]

SOLUTION_FILE = "solution.py"  # the name learner code is compiled under (tracebacks show it)
SCRIPT_FILE = "main.py"  # the name a snippet is compiled under
MAX_NODES = 100000
MAX_LOG_LINES = 200
MAX_TEXT = 4000
MAX_STDOUT = 64 * 1024
CYCLE = "…cycle"  # the same marker the JS runner puts where a list or tree loops back


# ---------------------------------------------------------------------------------------------------------------------
# Data structures given to learner code (the same fields and defaults as LeetCode's)


class ListNode:
    """Singly linked list node: ListNode(val=0, next=None)."""

    def __init__(self, val: Any = 0, next: Optional["ListNode"] = None):
        self.val = val
        self.next = next

    def __repr__(self) -> str:
        values = from_list(self)
        return "ListNode(" + " -> ".join(repr(v) if v != CYCLE else "..." for v in values) + ")"


class TreeNode:
    """Binary tree node: TreeNode(val=0, left=None, right=None)."""

    def __init__(self, val: Any = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self) -> str:
        return "TreeNode(" + repr(from_tree(self)) + ")"


# Learner code may declare its own node classes (a common habit), so nodes are recognised by shape, not by class.
def _is_tree_node(v: Any) -> bool:
    return not isinstance(v, type) and hasattr(v, "val") and hasattr(v, "left") and hasattr(v, "right")


def _is_list_node(v: Any) -> bool:
    return not isinstance(v, type) and hasattr(v, "val") and hasattr(v, "next") and not hasattr(v, "left")


# ---------------------------------------------------------------------------------------------------------------------
# Conversions (mirror toList / toCycleList / fromList / toTree / fromTree in dsa-runner.js)


def to_list(values: Optional[List[Any]], node: type = ListNode) -> Optional[ListNode]:
    dummy = node()
    tail = dummy
    for v in values or []:
        tail.next = node(v)
        tail = tail.next
    return dummy.next


def to_cycle_list(spec: List[Any], node: type = ListNode) -> Optional[ListNode]:
    """[values, pos]: the tail links back to the node at index pos (-1 = no cycle)."""
    values, pos = spec[0], spec[1]
    head = to_list(values, node)
    if head is None or pos is None or pos < 0:
        return head
    entry = None
    tail = head
    i = 0
    while True:
        if i == pos:
            entry = tail
        if tail.next is None:
            break
        tail = tail.next
        i += 1
    tail.next = entry
    return head


def from_list(head: Any) -> List[Any]:
    out: List[Any] = []
    seen = set()
    node = head
    while node is not None:
        if id(node) in seen or len(out) >= MAX_NODES:
            out.append(CYCLE)
            break
        seen.add(id(node))
        out.append(plain(getattr(node, "val", None)))
        node = getattr(node, "next", None)
    return out


def to_tree(values: Optional[List[Any]], node: type = TreeNode) -> Optional[TreeNode]:
    """Level order with None for missing children, e.g. [3, 9, 20, None, None, 15, 7]."""
    if not values or values[0] is None:
        return None
    root = node(values[0])
    queue = [root]
    head = 0
    i = 1
    while head < len(queue) and i < len(values):
        parent = queue[head]
        head += 1
        if i < len(values) and values[i] is not None:
            parent.left = node(values[i])
            queue.append(parent.left)
        i += 1
        if i < len(values) and values[i] is not None:
            parent.right = node(values[i])
            queue.append(parent.right)
        i += 1
    return root


def from_tree(root: Any) -> List[Any]:
    if root is None:
        return []
    out: List[Any] = []
    queue = [root]
    seen = set()
    head = 0
    while head < len(queue) and len(out) < MAX_NODES:
        node = queue[head]
        head += 1
        if node is None:
            out.append(None)
            continue
        if id(node) in seen:
            out.append(CYCLE)
            break
        seen.add(id(node))
        out.append(plain(getattr(node, "val", None)))
        queue.append(getattr(node, "left", None))
        queue.append(getattr(node, "right", None))
    while out and out[-1] is None:
        out.pop()
    return out


def convert_arg(value: Any, io_type: Optional[str], nodes: Tuple[type, type] = (ListNode, TreeNode)) -> Any:
    """A test's JSON argument → what the learner's function receives (problem.json's io.args)."""
    list_node, tree_node = nodes
    if io_type == "list":
        return to_list(value, list_node)
    if io_type == "tree":
        return to_tree(value, tree_node)
    if io_type == "list-cycle":
        return to_cycle_list(value, list_node)
    if io_type == "list[]":
        return [to_list(v, list_node) for v in value]
    return copy.deepcopy(value)


def _expect_node(v: Any, kind: str) -> None:
    ok = _is_list_node(v) if kind == "ListNode" else _is_tree_node(v)
    if v is not None and not ok:
        what = "head" if kind == "ListNode" else "root"
        raise TypeError("return the %s %s (or None), not a %s" % (what, kind, type(v).__name__))


def to_plain(v: Any, io_type: Optional[str] = None) -> Any:
    """The learner's return value → plain JSON-like data for comparison and display (problem.json's io.returns)."""
    if io_type == "list":
        _expect_node(v, "ListNode")
        return from_list(v)
    if io_type == "tree":
        _expect_node(v, "TreeNode")
        return from_tree(v)
    if io_type == "node-val":
        return None if v is None else plain(getattr(v, "val", None))
    return plain(v)


def plain(v: Any, depth: int = 0) -> Any:
    """Any Python value → JSON-like data: nodes become arrays, tuples/sets/deques/iterators lists, keys strings."""
    if v is None or isinstance(v, (bool, str)):
        return v
    if isinstance(v, int):
        return int(v)  # IntEnum and friends
    if isinstance(v, float):
        return v
    if _is_tree_node(v):
        return from_tree(v)
    if _is_list_node(v):
        return from_list(v)
    if depth > 50:
        return "…"
    if isinstance(v, dict):
        return {str(k): plain(x, depth + 1) for k, x in v.items()}
    if isinstance(v, (set, frozenset)):
        try:
            items = sorted(v)
        except TypeError:
            items = sorted(v, key=lambda x: _canon(plain(x, depth + 1)))
        return [plain(x, depth + 1) for x in items]
    if isinstance(v, (bytes, bytearray)):
        return bytes(v).decode("utf-8", "replace")
    if isinstance(v, numbers.Real):
        return float(v)  # Fraction, Decimal…
    if isinstance(v, (list, tuple, range)) or hasattr(v, "__iter__"):
        try:
            return [plain(x, depth + 1) for x in itertools.islice(iter(v), MAX_NODES)]
        except TypeError:
            pass
    return repr(v)


def _canon(v: Any) -> str:
    return json.dumps(_json_safe(v), sort_keys=True)


def _json_safe(v: Any) -> Any:
    if isinstance(v, float) and not math.isfinite(v):
        return {"$num": "NaN" if math.isnan(v) else ("Infinity" if v > 0 else "-Infinity")}
    if isinstance(v, list):
        return [_json_safe(x) for x in v]
    if isinstance(v, dict):
        return {k: _json_safe(x) for k, x in v.items()}
    return v


def dumps(v: Any) -> str:
    """JSON text that JavaScript's JSON.parse accepts (non-finite floats tagged as {"$num": ...})."""
    return json.dumps(_json_safe(v), separators=(",", ":"), allow_nan=False)


# ---------------------------------------------------------------------------------------------------------------------
# Names: problem.json uses JavaScript names; Python code uses snake_case (src/lib/dsa/python.ts generates the starters)


def snake_case(name: str) -> str:
    """accountsMerge → accounts_merge, evalRPN → eval_rpn, isValidBST → is_valid_bst, solveNQueens → solve_n_queens."""
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", s)
    return s.lower()


def _names(js_name: str) -> List[str]:
    """Where to look, in order: snake_case first, then the JavaScript (LeetCode) camelCase spelling."""
    snake = snake_case(js_name)
    return [snake] if snake == js_name else [snake, js_name]


# ---------------------------------------------------------------------------------------------------------------------
# Output capture


def _clip(s: str) -> str:
    return s if len(s) <= MAX_TEXT else "%s… (%d more characters)" % (s[:MAX_TEXT], len(s) - MAX_TEXT)


class _Capture:
    """Collects print() output as raw text (stdout) and as lines with a level (logs), with the JS runner's limits."""

    def __init__(self) -> None:
        self.logs: List[Dict[str, str]] = []
        self._stdout: List[str] = []
        self._stdout_size = 0
        self._partial = {"log": "", "error": ""}
        self._full = False

    def write(self, level: str, s: str) -> None:
        if level == "log" and self._stdout_size < MAX_STDOUT:
            piece = s[: MAX_STDOUT - self._stdout_size]
            self._stdout.append(piece)
            self._stdout_size += len(piece)
        if self._full:
            return
        parts = (self._partial[level] + s).split("\n")
        rest = parts.pop()
        for line in parts:
            self._push(level, line)
        # An endless print(x, end="") must not grow without bound: keep just enough to show the clipped line.
        self._partial[level] = rest if len(rest) <= MAX_TEXT * 2 else rest[: MAX_TEXT * 2]

    def _push(self, level: str, text: str) -> None:
        if len(self.logs) >= MAX_LOG_LINES:
            if not self._full:
                self.logs.append({"level": "warn", "text": "… output truncated after %d lines" % MAX_LOG_LINES})
                self._full = True
            return
        self.logs.append({"level": level, "text": _clip(text)})

    def finish(self) -> None:
        for level in ("log", "error"):
            if self._partial[level]:
                self._push(level, self._partial[level])
                self._partial[level] = ""

    def absorb(self, other: "_Capture") -> None:
        """Takes over another capture's output (module-level prints are shown with the first test)."""
        other.finish()
        self._stdout = other._stdout + self._stdout
        self._stdout_size += other._stdout_size
        self.logs = other.logs + self.logs
        self._full = other._full

    @property
    def stdout(self) -> str:
        return "".join(self._stdout)

    @contextlib.contextmanager
    def active(self) -> Iterator[None]:
        with contextlib.redirect_stdout(_Stream(self, "log")), contextlib.redirect_stderr(_Stream(self, "error")):
            yield


class _Stream:
    """A minimal text stream for sys.stdout / sys.stderr."""

    encoding = "utf-8"
    errors = "strict"

    def __init__(self, capture: _Capture, level: str) -> None:
        self._capture = capture
        self._level = level

    def write(self, s: str) -> int:
        if not isinstance(s, str):
            raise TypeError("write() argument must be str, not %s" % type(s).__name__)
        self._capture.write(self._level, s)
        return len(s)

    def writelines(self, lines: Any) -> None:
        for line in lines:
            self.write(line)

    def flush(self) -> None:
        pass

    def isatty(self) -> bool:
        return False

    def writable(self) -> bool:
        return True


# ---------------------------------------------------------------------------------------------------------------------
# Errors


def error_info(exc: BaseException, files: Optional[List[str]] = None, main: str = SOLUTION_FILE) -> Dict[str, Any]:
    """{name, message, line, traceback}. `line` is the deepest line of `main` on the stack (for SyntaxError, the line
    it points at); the traceback shows only frames from the learner's files, never the runner's."""
    files = files or [main]
    name = type(exc).__name__
    message = str(exc)
    line = None
    if isinstance(exc, SyntaxError):
        message = exc.msg or message
        if exc.filename == main:
            line = exc.lineno
        text = "".join(traceback.format_exception_only(type(exc), exc))
        if exc.filename in files:
            frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in files]
            prefix = "Traceback (most recent call last):\n" + "".join(traceback.format_list(frames)) if frames else ""
            return {"name": name, "message": message, "line": line, "traceback": _clip(prefix + text).rstrip()}
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in files]
    mine = [f for f in frames if f.filename == main]
    if mine and line is None:
        line = mine[-1].lineno
    if not frames:  # raised outside the learner's code (e.g. a missing function): the message says it all
        return {"name": name, "message": message, "line": line, "traceback": None}
    text = "Traceback (most recent call last):\n" + "".join(traceback.format_list(frames))
    text += "".join(traceback.format_exception_only(type(exc), exc))
    return {"name": name, "message": message, "line": line, "traceback": _clip(text).rstrip()}


def _timeout_info(exc: BaseException, message: str, files: Optional[List[str]] = None, main: str = SOLUTION_FILE) -> Dict[str, Any]:
    """error_info for the per-test timer, shown as a TimeoutError at the line that was running."""
    info = error_info(exc, files, main)
    info["name"] = "TimeoutError"
    info["message"] = message
    if info["traceback"]:
        info["traceback"] = info["traceback"].rsplit("\n", 1)[0] + "\nTimeoutError: " + message
    return info


class _TimeLimit(BaseException):
    """Raised by the CPython command line's per-test timer. A BaseException, so `except Exception` can't swallow it."""


@contextlib.contextmanager
def _time_limit(ms: Optional[float]) -> Iterator[None]:
    """A per-test time limit through SIGALRM: CPython's main thread only. Elsewhere (Pyodide, threads) it does
    nothing, and the host enforces the limit instead (the browser terminates the worker)."""
    signal: Any = None
    previous: Any = None

    def on_alarm(signum: int, frame: Any) -> None:
        raise _TimeLimit()

    if ms and sys.platform != "emscripten":
        try:
            import signal as _signal
            import threading

            if hasattr(_signal, "setitimer") and threading.current_thread() is threading.main_thread():
                previous = _signal.signal(_signal.SIGALRM, on_alarm)
                _signal.setitimer(_signal.ITIMER_REAL, ms / 1000.0)
                signal = _signal
        except Exception:  # a platform without working signals: no limit from here
            signal = None
    if signal is None:
        yield
        return
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def _no_input(prompt: Any = "") -> str:
    raise EOFError("input() is not available here: your code receives each test's arguments directly")


# ---------------------------------------------------------------------------------------------------------------------
# Loading learner code


def _fresh_nodes() -> Tuple[type, type]:
    """Per-run subclasses of ListNode/TreeNode, so a learner's patch (the common `ListNode.__lt__ = ...` for heapq)
    stays in that run instead of leaking into later runs in the same long-lived Pyodide worker."""
    return (
        type("ListNode", (ListNode,), {"__module__": "__main__", "__doc__": ListNode.__doc__}),
        type("TreeNode", (TreeNode,), {"__module__": "__main__", "__doc__": TreeNode.__doc__}),
    )


def _namespace(nodes: Tuple[type, type]) -> Dict[str, Any]:
    # LeetCode habits work: ListNode/TreeNode and the common typing names are already defined.
    return {
        "__name__": "__main__",
        "__builtins__": builtins,
        "ListNode": nodes[0],
        "TreeNode": nodes[1],
        "List": typing.List,
        "Optional": typing.Optional,
        "Dict": typing.Dict,
        "Set": typing.Set,
        "Tuple": typing.Tuple,
        "input": _no_input,
    }


def _register_source(filename: str, code: str) -> None:
    """Lets tracebacks show the learner's source lines (mtime None: linecache.checkcache leaves the entry alone)."""
    linecache.cache[filename] = (len(code), None, code.splitlines(True), filename)


def _exec(code: str, filename: str, ns: Dict[str, Any]) -> None:
    _register_source(filename, code)
    # dont_inherit: the learner's code gets only its own __future__ imports, not this module's.
    exec(compile(code, filename, "exec", dont_inherit=True), ns)


class _SourceModules(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Makes `import name` find modules given as source text (a snippet's sibling files), for one run."""

    def __init__(self, sources: Dict[str, str]) -> None:
        self.sources = sources

    def find_spec(self, fullname: str, path: Any = None, target: Any = None) -> Any:
        if fullname in self.sources:
            return importlib.util.spec_from_loader(fullname, self, origin=fullname + ".py")
        return None

    def create_module(self, spec: Any) -> None:
        return None

    def exec_module(self, module: Any) -> None:
        _exec(self.sources[module.__name__], module.__name__ + ".py", module.__dict__)

    @contextlib.contextmanager
    def installed(self) -> Iterator[None]:
        saved = {n: sys.modules.pop(n) for n in self.sources if n in sys.modules}
        sys.meta_path.insert(0, self)
        try:
            yield
        finally:
            if self in sys.meta_path:
                sys.meta_path.remove(self)
            for n in self.sources:
                sys.modules.pop(n, None)
            sys.modules.update(saved)


def _find_function(ns: Dict[str, Any], fn: str) -> Callable[..., Any]:
    names = _names(fn)
    for n in names:
        f = ns.get(n)
        if callable(f) and not isinstance(f, type):
            return f
    # LeetCode style: class Solution with the method on it (a fresh instance per test).
    solution = ns.get("Solution")
    if isinstance(solution, type):
        for n in names:
            if callable(getattr(solution, n, None)):
                method = n
                return lambda *args: getattr(solution(), method)(*args)
    raise NameError("Define a function named %s." % names[0])


def _find_class(ns: Dict[str, Any], name: str) -> type:
    cls = ns.get(name)
    if isinstance(cls, type):
        return cls
    raise NameError("Define a class named %s." % name)


def _method(obj: Any, class_name: str, op: str) -> Callable[..., Any]:
    for n in _names(op):
        m = getattr(obj, n, None)
        if callable(m):
            return m
    raise AttributeError("%s has no method %s (for the %s call)" % (class_name, _names(op)[0], op))


# ---------------------------------------------------------------------------------------------------------------------
# Test runs


def _nullish(value: Any) -> bool:
    """None, or JavaScript null / undefined as Pyodide passes them (null arrives as a JsNull object, not None)."""
    return value is None or type(value).__name__ in ("JsNull", "JsUndefined")


def _as_data(value: Any) -> Any:
    """Accepts plain data, JSON text, or a Pyodide JsProxy (anything with to_py()). JS null / undefined → None."""
    if _nullish(value):
        return None
    if isinstance(value, (str, bytes)):
        return json.loads(value)
    if hasattr(value, "to_py"):
        return value.to_py()
    return value


def _as_number(value: Any) -> Optional[float]:
    return None if _nullish(value) or not value else float(value)


def _is_design(problem: Dict[str, Any]) -> bool:
    # The browser sends the parsed problem (kind is set); a raw problem.json may leave kind out.
    return problem.get("kind") == "design" or ("className" in problem and "fn" not in problem)


def _call(problem: Dict[str, Any], target: Any, test: Dict[str, Any], nodes: Tuple[type, type]) -> Any:
    if _is_design(problem):
        outputs: List[Any] = []
        obj = None
        ops = test["ops"]
        all_args = test.get("args") or []
        for i, op in enumerate(ops):
            args = copy.deepcopy(all_args[i]) if i < len(all_args) and all_args[i] is not None else []
            if i == 0:
                obj = target(*args)  # the constructor op
                outputs.append(None)
                continue
            outputs.append(plain(_method(obj, problem.get("className", ""), op)(*args)))
        return outputs

    io = problem.get("io") or {}
    io_args = io.get("args") or []
    args = [convert_arg(a, io_args[i] if i < len(io_args) else None, nodes) for i, a in enumerate(test["args"])]
    ret = target(*args)
    in_place = problem.get("inPlace")
    if in_place is not None:
        t = io_args[in_place] if in_place < len(io_args) else None
        return to_plain(args[in_place], t if t in ("list", "tree") else None)
    return to_plain(ret, io.get("returns"))


def _run_one(
    problem: Dict[str, Any], target: Any, index: int, nodes: Tuple[type, type], setup: Optional[_Capture], time_limit_ms: Optional[float]
) -> Dict[str, Any]:
    capture = _Capture()
    if setup is not None:
        capture.absorb(setup)
    out: Dict[str, Any] = {"index": index, "actual": None, "error": None, "logs": [], "stdout": "", "ms": 0}
    started = time.perf_counter()
    try:
        with capture.active(), _time_limit(time_limit_ms):
            out["actual"] = _call(problem, target, problem["tests"][index], nodes)
    except KeyboardInterrupt as exc:  # Pyodide's interrupt buffer (the host stopped the run)
        out["error"] = error_info(exc)
        out["error"]["message"] = out["error"]["message"] or "The run was stopped."
        out["stopped"] = True
    except _TimeLimit as exc:
        out["error"] = _timeout_info(exc, "Time limit exceeded (%g ms): an infinite loop, or too slow." % time_limit_ms)
    except BaseException as exc:  # SystemExit and RecursionError included: the learner sees them as errors
        out["error"] = error_info(exc)
    finally:
        out["ms"] = round((time.perf_counter() - started) * 1000, 2)
        capture.finish()
        out["logs"] = capture.logs
        out["stdout"] = capture.stdout
    if out["error"] is not None:
        out["actual"] = None
    return out


def run_problem(
    problem: Any,
    code: str,
    indices: Optional[List[int]] = None,
    on_result: Optional[Callable[[Dict[str, Any]], Any]] = None,
    time_limit_ms: Optional[float] = None,
) -> Dict[str, Any]:
    """Runs `code` against problem["tests"] (all of them, or those at `indices`).

    Function problems: calls snake_case(fn) (or fn, or Solution().fn) with the converted arguments; `actual` is the
    converted return value, or the mutated argument for in-place problems (problem["inPlace"]). Design problems:
    builds problem["className"] with the first op's args, calls snake_case(op) methods; `actual` is the list of
    outputs (None for the constructor). `on_result` gets each result as soon as it is ready.
    Returns {"compileError": ErrorInfo | None, "results": [...]}, like runTests in dsa-runner.js.
    """
    problem = _as_data(problem)
    indices = _as_data(indices)
    on_result = None if _nullish(on_result) else on_result
    time_limit_ms = _as_number(time_limit_ms)
    design = _is_design(problem)
    setup = _Capture()
    try:
        nodes = _fresh_nodes()
        ns = _namespace(nodes)
        with setup.active(), _time_limit(time_limit_ms):
            _exec(code, SOLUTION_FILE, ns)
        target: Any = _find_class(ns, problem["className"]) if design else _find_function(ns, problem["fn"])
    except _TimeLimit as exc:
        return {"compileError": _timeout_info(exc, "Time limit exceeded while loading the code."), "results": []}
    except BaseException as exc:
        return {"compileError": error_info(exc), "results": []}

    order = list(range(len(problem["tests"]))) if indices is None else [int(i) for i in indices]
    results = []
    for k, index in enumerate(order):
        result = _run_one(problem, target, index, nodes, setup if k == 0 else None, time_limit_ms)
        results.append(result)
        if on_result is not None:
            on_result(result)
        if result.get("stopped"):
            break
    return {"compileError": None, "results": results}


def run_problem_json(
    problem_json: str,
    code: str,
    indices_json: Optional[str] = None,
    on_result: Optional[Callable[[str], Any]] = None,
    time_limit_ms: Optional[float] = None,
) -> str:
    """run_problem with JSON text in and out (the easiest way across the Pyodide boundary). `on_result` gets JSON."""
    callback = None if _nullish(on_result) else (lambda r: on_result(dumps(r)))
    return dumps(run_problem(_as_data(problem_json), code, _as_data(indices_json), callback, time_limit_ms))


def run_script(code: str, modules: Optional[Dict[str, str]] = None, time_limit_ms: Optional[float] = None) -> Dict[str, Any]:
    """Runs a snippet as __main__ and returns {"error", "logs", "stdout", "ms"}. `modules` maps a module name to its
    source, so `from frequency import count_all` in a snippet imports the sibling file frequency.py."""
    modules = _as_data(modules) or {}
    time_limit_ms = _as_number(time_limit_ms)
    capture = _Capture()
    error = None
    started = time.perf_counter()
    finder = _SourceModules(dict(modules))
    try:
        with finder.installed(), capture.active(), _time_limit(time_limit_ms):
            _exec(code, SCRIPT_FILE, _namespace(_fresh_nodes()))
    except _TimeLimit as exc:
        error = _timeout_info(exc, "Time limit exceeded (%g ms)." % time_limit_ms, [SCRIPT_FILE] + [n + ".py" for n in modules], SCRIPT_FILE)
    except BaseException as exc:
        error = error_info(exc, [SCRIPT_FILE] + [n + ".py" for n in modules], SCRIPT_FILE)
    capture.finish()
    ms = round((time.perf_counter() - started) * 1000, 2)
    return {"error": error, "logs": capture.logs, "stdout": capture.stdout, "ms": ms}


def run_script_json(code: str, modules_json: Optional[str] = None, time_limit_ms: Optional[float] = None) -> str:
    return dumps(run_script(code, _as_data(modules_json), time_limit_ms))


# ---------------------------------------------------------------------------------------------------------------------
# Command line (CPython only; never runs inside Pyodide, where __name__ may also be "__main__")
#
#   python3 -I -B public/dsa-runner.py --stdin
#       reads {"mode": "tests", "problem": {...}, "code": "...", "indices": null, "timeLimitMs": 3000}
#          or {"mode": "script", "code": "...", "modules": {"name": "source"}, "timeLimitMs": 3000}
#       and prints protocol lines prefixed with "@@dsa ": {"type": "result", "result": TestRun} per test (as each one
#       finishes), then {"type": "done", "compileError": ...}; or {"type": "script", ...ScriptRun} for a script.
#   python3 -I -B public/dsa-runner.py --script path/to/try_it.py [--timeout ms]
#       runs a snippet like the browser does (sibling .py files importable) and prints its output; exit 1 on error.

PROTOCOL = "@@dsa "


def _main(argv: List[str]) -> int:
    out = sys.stdout

    def emit(obj: Dict[str, Any]) -> None:
        out.write(PROTOCOL + dumps(obj) + "\n")
        out.flush()

    if argv[:1] == ["--stdin"]:
        payload = json.loads(sys.stdin.read())
        limit = payload.get("timeLimitMs")
        if payload.get("mode") == "script":
            run = run_script(payload["code"], payload.get("modules"), limit)
            run["type"] = "script"
            emit(run)
            return 0
        outcome = run_problem(payload["problem"], payload["code"], payload.get("indices"), lambda r: emit({"type": "result", "result": r}), limit)
        emit({"type": "done", "compileError": outcome["compileError"]})
        return 0

    if argv[:1] == ["--script"] and len(argv) >= 2:
        import os

        path = argv[1]
        limit = float(argv[argv.index("--timeout") + 1]) if "--timeout" in argv else 5000.0
        folder = os.path.dirname(os.path.abspath(path))
        modules = {}
        for f in sorted(os.listdir(folder)):
            if f.endswith(".py") and not f.startswith("test_") and os.path.join(folder, f) != os.path.abspath(path):
                with open(os.path.join(folder, f), encoding="utf-8") as fh:
                    modules[f[:-3]] = fh.read()
        with open(path, encoding="utf-8") as fh:
            run = run_script(fh.read(), modules, limit)
        for line in run["logs"]:
            out.write(line["text"] + "\n")
        if run["error"]:
            out.write("\n" + (run["error"]["traceback"] or "%s: %s" % (run["error"]["name"], run["error"]["message"])) + "\n")
            return 1
        return 0

    sys.stderr.write(__doc__ or "")
    sys.stderr.write("\nusage: dsa-runner.py --stdin | --script file.py [--timeout ms]\n")
    return 2


if __name__ == "__main__" and sys.platform != "emscripten" and len(sys.argv) > 1:
    sys.exit(_main(sys.argv[1:]))
