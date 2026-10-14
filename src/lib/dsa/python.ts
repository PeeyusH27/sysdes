// Python versions of the practice problems' names and starter code. Pure functions: the server loader, the browser and
// the tests all use them, so a Python starter always names things the way the Python harness (public/dsa-runner.py)
// looks them up: functions and methods in snake_case, the class under its own name, the constructor as __init__.
import type { DesignProblemMeta, FunctionProblemMeta, ProblemMeta } from "./schema";

const PY_KEYWORDS = new Set(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(
    " ",
  ),
);

/** camelCase → snake_case: accountsMerge → accounts_merge, evalRPN → eval_rpn, isValidBST → is_valid_bst, word1 → word1. */
export function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** A parameter name that is safe to write in Python (a keyword gets a trailing underscore). */
export const pyParam = (name: string) => {
  const s = snakeCase(name);
  return PY_KEYWORDS.has(s) ? `${s}_` : s;
};

/** The name a problem's Python code must define: the snake_case function, or the class. */
export const pythonTarget = (meta: ProblemMeta) => (meta.kind === "design" ? meta.className : snakeCase(meta.fn));

/** A design op as a Python method name: the constructor op becomes __init__, the rest snake_case. */
export const pythonMethod = (op: string, className: string) => (op === className ? "__init__" : snakeCase(op));

/**
 * TS-ish type from problem.json → Python type hint. `float` marks problems compared as floats, whose numbers are
 * floats. Nodes are Optional, as on LeetCode: an empty list or tree arrives as None.
 */
export function pyType(ts: string, float = false): string {
  const parts = ts
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  const nullable = parts.some((p) => p === "null" || p === "undefined");
  const rest = parts.filter((p) => p !== "null" && p !== "undefined");
  if (rest.length === 0) return "None";
  if (rest.length > 1) {
    const union = `Union[${rest.map((p) => pyType(p, float)).join(", ")}]`;
    return nullable ? `Optional[${union}]` : union;
  }
  const one = single(rest[0], float);
  return nullable && !one.startsWith("Optional[") ? `Optional[${one}]` : one;
}

function single(t: string, float: boolean): string {
  if (t.endsWith("[]")) return `List[${single(t.slice(0, -2).trim(), float)}]`;
  switch (t) {
    case "number":
      return float ? "float" : "int";
    case "string":
      return "str";
    case "boolean":
      return "bool";
    case "void":
      return "None";
    case "ListNode":
    case "TreeNode":
      return `Optional[${t}]`;
    default:
      return "Any";
  }
}

const LIST_DOC = `# Linked list nodes are provided (you don't need to define them):
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next`;
const TREE_DOC = `# Tree nodes are provided (you don't need to define them):
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right`;
const HEAP_DOC = `# heapq is a min-heap: heappush(h, x), heappop(h), and h[0] is the smallest.
import heapq`;

/** `from typing import …` for the names a piece of generated code uses. */
function typingImport(code: string) {
  const used = ["Any", "List", "Optional", "Union"].filter((n) => new RegExp(`(?:[:\\[,]|->)\\s*${n}\\b`).test(code));
  return used.length ? `from typing import ${used.join(", ")}\n` : "";
}

/** Python starter for a function problem: typed signature, `pass` body, and the node classes in a comment when used. */
export function functionPythonStarter(meta: FunctionProblemMeta) {
  const float = meta.compare === "float";
  const io = [...(meta.io?.args ?? []), meta.io?.returns];
  const types = [...meta.types.params, meta.types.returns].join(" ");
  const docs: string[] = [];
  if (io.some((t) => t === "list" || t === "list-cycle" || t === "list[]") || /\bListNode\b/.test(types)) docs.push(LIST_DOC);
  if (io.includes("tree") || /\bTreeNode\b/.test(types)) docs.push(TREE_DOC);
  // Inputs keep their natural type (an int stays an int); only results compared as floats are floats.
  const params = meta.params.map((p, i) => `${pyParam(p)}: ${pyType(meta.types.params[i] ?? "any")}`);
  const def = `def ${snakeCase(meta.fn)}(${params.join(", ")}) -> ${pyType(meta.types.returns, float)}:\n    pass\n`;
  return assemble(docs, def);
}

function assemble(docs: string[], body: string) {
  const head = typingImport(body);
  const top = [head.trimEnd(), ...docs].filter(Boolean).join("\n\n");
  return top ? `${top}\n\n\n${body}` : body;
}

interface JsMethod {
  name: string;
  params: { name: string; type?: string; doc?: string }[];
  returns?: { type: string; doc?: string };
  doc: string;
}

/** Reads `class X { constructor(a) {…} /** @param {number} a … *\/ method(a) {…} }` from a JS starter. */
export function parseJsClass(src: string): { className: string; methods: JsMethod[] } | null {
  const cls = /\bclass\s+([A-Za-z_$][\w$]*)[^{]*\{/.exec(src);
  if (!cls) return null;
  const body = src.slice(cls.index + cls[0].length);
  const methods: JsMethod[] = [];
  const re = /(\/\*\*[\s\S]*?\*\/)?\s*^[ \t]*(?:static\s+|async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const [, jsdoc = "", name, rawParams] = m;
    if (["if", "for", "while", "switch", "catch", "function"].includes(name)) continue;
    const doc = parseJsDoc(jsdoc);
    const params = rawParams
      .split(",")
      .map((p) => p.trim().replace(/\s*=.*$/, ""))
      .filter(Boolean)
      .map((p) => ({ name: p, ...doc.params[p] }));
    methods.push({ name, params, returns: doc.returns, doc: doc.text });
  }
  return { className: cls[1], methods };
}

function parseJsDoc(src: string) {
  const text = src
    .replace(/^\/\*\*|\*\/$/g, "")
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .join(" ")
    .trim();
  const firstTag = text.search(/@(param|returns?)\b/);
  const out = { text: (firstTag === -1 ? text : text.slice(0, firstTag)).trim(), params: {} as Record<string, { type?: string; doc?: string }>, returns: undefined as JsMethod["returns"] };
  for (const m of text.matchAll(/@param\s+\{([^}]*)\}\s+\[?([\w$]+)\]?\s*([^@]*)/g)) out.params[m[2]] = { type: m[1].trim(), doc: m[3].trim() || undefined };
  const r = /@returns?\s+\{([^}]*)\}\s*([^@]*)/.exec(text);
  if (r) out.returns = { type: r[1].trim(), doc: r[2].trim() || undefined };
  return out;
}

const sentence = (s: string) => {
  const t = s.trim().replace(/^[-:]\s*/, "");
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Python starter for a design problem. With the JS starter it keeps the same methods, parameters, types and notes;
 * without one, methods come from the ops the tests call (with one parameter per argument).
 */
export function designPythonStarter(meta: DesignProblemMeta, starterJs?: string) {
  const float = meta.compare === "float";
  const parsed = starterJs ? parseJsClass(starterJs) : null;
  let methods: JsMethod[];
  if (parsed && parsed.className === meta.className) {
    methods = parsed.methods;
  } else {
    const arity = new Map<string, number>();
    for (const t of meta.tests) t.ops.forEach((op, i) => arity.set(op, Math.max(arity.get(op) ?? 0, t.args[i]?.length ?? 0)));
    methods = [...arity].map(([op, n]) => ({
      name: op === meta.className ? "constructor" : op,
      params: Array.from({ length: n }, (_, i) => ({ name: n === 1 ? "value" : `arg${i + 1}` })),
      doc: "",
    }));
  }
  if (!methods.some((m) => m.name === "constructor")) methods.unshift({ name: "constructor", params: [], doc: "" });
  const defs = methods.map((m) => {
    const ctor = m.name === "constructor";
    const params = ["self", ...m.params.map((p) => (p.type ? `${pyParam(p.name)}: ${pyType(p.type)}` : pyParam(p.name)))];
    const ret = ctor ? " -> None" : m.returns ? ` -> ${pyType(m.returns.type, float)}` : "";
    const notes = [
      cap(sentence(m.doc)),
      ...m.params.filter((p) => p.doc).map((p) => `${pyParam(p.name)}: ${sentence(p.doc!)}`),
      m.returns?.doc && !ctor ? `Returns ${sentence(m.returns.doc)}` : "",
    ].filter(Boolean);
    const docstring = notes.length === 1 ? `        """${notes[0]}"""\n` : notes.length ? `        """\n${notes.map((n) => `        ${n}`).join("\n")}\n        """\n` : "";
    return `    def ${ctor ? "__init__" : snakeCase(m.name)}(${params.join(", ")})${ret}:\n${docstring}        pass\n`;
  });
  const docs = starterJs && /no built-in heap/i.test(starterJs) ? [HEAP_DOC] : [];
  return assemble(docs, `class ${meta.className}:\n${defs.join("\n")}`);
}

/** The Python starter for any problem. `starterJs` is the problem's starter.js, when it has one. */
export function generatePythonStarter(meta: ProblemMeta, starterJs?: string) {
  return meta.kind === "design" ? designPythonStarter(meta, starterJs) : functionPythonStarter(meta);
}
