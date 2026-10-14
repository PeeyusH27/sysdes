// Reader input for algorithm walkthroughs: works out an edit form from a trace's preset inputs, shows an input as
// short text, and parses the reader's text back with friendly, specific errors. Pure data, no React: defineTrace uses
// it at build time (to describe the form) and the browser uses it to read the form.
import type { ColKind, FieldKind, FieldSpec } from "./types";

/** What a viz.ts may say about one input field. `false` hides the field (the preset's value is used, or `prepare` derives it). */
export type FieldHint = Partial<Omit<FieldSpec, "key">>;

/** Default caps: small enough that every view still fits a phone, big enough to be interesting. */
const DEFAULTS: Record<FieldKind, Partial<FieldSpec>> = {
  int: { min: -999, max: 999 },
  letter: { min: 0, max: 9 },
  bool: {},
  text: { minLength: 1, maxLength: 16 },
  ints: { minItems: 1, maxItems: 12, min: -999, max: 999 },
  tree: { minItems: 1, maxItems: 15, min: -999, max: 999 },
  words: { minItems: 1, maxItems: 8, minLength: 1, maxLength: 10 },
  rows: { minItems: 1, maxItems: 12, min: -999, max: 999, maxRow: 12, minLength: 1, maxLength: 10 },
  lines: { minItems: 1, maxItems: 8, minLength: 1, maxLength: 10 },
  json: {},
};

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNumOrNull = (v: unknown) => v === null || isInt(v);
const letter = (i: number) => String.fromCharCode(65 + i);

function inferKind(values: unknown[]): { kind: FieldKind; cols?: ColKind[] } {
  const v = values[0];
  if (isInt(v) && values.every(isInt)) return { kind: "int" };
  if (typeof v === "boolean") return { kind: "bool" };
  if (typeof v === "string") return { kind: "text" };
  if (Array.isArray(v) && values.every(Array.isArray)) {
    const items = (values as unknown[][]).flat();
    if (items.every(isInt)) return { kind: "ints" };
    if (items.every(isNumOrNull)) return { kind: "tree" };
    if (items.every((x) => typeof x === "string")) return { kind: "words" };
    if (items.every(Array.isArray)) {
      const rows = items as unknown[][];
      const len = rows[0]?.length ?? 0;
      if (len > 0 && len <= 4 && rows.every((r) => r.length === len)) {
        const cols = Array.from({ length: len }, (_, c): ColKind | null =>
          rows.every((r) => isInt(r[c])) ? "int" : rows.every((r) => typeof r[c] === "string") ? "word" : null,
        );
        if (cols.every(Boolean)) return { kind: "rows", cols: cols as ColKind[] };
      }
      if (rows.every((r) => r.every(isInt))) return { kind: "rows" };
    }
  }
  return { kind: "json" };
}

function helpFor(f: FieldSpec): string {
  switch (f.kind) {
    case "int":
      return `Whole number from ${f.min} to ${f.max}.`;
    case "letter":
      return `A node letter, A to ${letter(f.max ?? 9)}.`;
    case "bool":
      return "";
    case "text":
      return `${f.minLength}–${f.maxLength} characters.`;
    case "ints":
      return `Whole numbers, separated by commas (up to ${f.maxItems}).`;
    case "tree":
      return `Level order, separated by commas, null for a missing child (up to ${f.maxItems}).`;
    case "words":
      return `Words separated by commas (up to ${f.maxItems}).`;
    case "rows":
      return f.cols ? `One per line: ${(f.colNames ?? f.cols.map((_, i) => `value${i + 1}`)).join(" ")} (up to ${f.maxItems} lines).` : `One list per line, numbers separated by spaces; - for an empty one (up to ${f.maxItems} lines).`;
    case "lines":
      return `One row per line (up to ${f.maxItems}).`;
    case "json":
      return "JSON.";
  }
}

/** The form for a trace: one field per key of the first preset's input, in order, unless a hint hides it. */
export function inferFields(inputs: unknown[], hints: Record<string, FieldHint | false | undefined> = {}): FieldSpec[] {
  const first = inputs[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return [];
  const out: FieldSpec[] = [];
  for (const key of Object.keys(first)) {
    const hint = hints[key];
    if (hint === false) continue;
    const values = inputs.map((i) => (i as Record<string, unknown>)[key]);
    const inferred = inferKind(values);
    const kind = hint?.kind ?? inferred.kind;
    const f: FieldSpec = { key, kind, label: key, help: "", ...DEFAULTS[kind], ...(kind === "rows" && !hint?.kind ? { cols: inferred.cols } : {}), ...hint } as FieldSpec;
    if (!hint?.help) f.help = helpFor(f);
    out.push(f);
  }
  return out;
}

// ------------------------------------------------------------------ input → text
const col = (kind: ColKind, v: unknown) => (kind === "letter" ? letter(v as number) : String(v));

export function formatValue(f: FieldSpec, v: unknown): string {
  switch (f.kind) {
    case "int":
    case "text":
      return String(v);
    case "letter":
      return letter(v as number);
    case "bool":
      return v ? "true" : "false";
    case "ints":
    case "tree":
    case "words":
      return (v as unknown[]).map((x) => (x === null ? "null" : String(x))).join(", ");
    case "rows":
      return (v as unknown[][]).map((row) => (row.length === 0 ? "-" : row.map((x, c) => col(f.cols?.[c] ?? "int", x)).join(" "))).join("\n");
    case "lines":
      return (v as string[]).join("\n");
    case "json":
      return JSON.stringify(v);
  }
}

export function formatInput(fields: FieldSpec[], input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = formatValue(f, (input as Record<string, unknown>)[f.key]);
  return out;
}

// ------------------------------------------------------------------ text → input
export class FieldError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "1, 2, 3", "[1,2,3]" and "1 2 3" all become ["1", "2", "3"]. */
const tokens = (s: string) => s.replace(/[[\]"'()]/g, " ").split(/[\s,;]+/).filter(Boolean);

function parseInt_(f: FieldSpec, raw: string, what = f.label): number {
  const s = raw.trim();
  if (!/^[-+]?\d+$/.test(s)) throw new FieldError(f.key, `${what}: "${s || " "}" is not a whole number.`);
  const n = Number(s);
  if (f.min !== undefined && n < f.min) throw new FieldError(f.key, `${what}: ${n} is too small (the smallest allowed is ${f.min}).`);
  if (f.max !== undefined && n > f.max) throw new FieldError(f.key, `${what}: ${n} is too big (the largest allowed is ${f.max}).`);
  return n;
}

/** Letter columns in rows always allow A to J (graphs are capped at 10 nodes); a letter field uses its own max. */
function parseLetter(f: FieldSpec, raw: string, what = f.label, max = f.max ?? 9): number {
  const s = raw.trim();
  const n = /^[a-z]$/i.test(s) ? s.toUpperCase().charCodeAt(0) - 65 : /^\d+$/.test(s) ? Number(s) : NaN;
  if (!(n >= 0 && n <= max)) throw new FieldError(f.key, `${what}: "${s || " "}" is not a node. Use a letter from A to ${letter(max)}.`);
  return n;
}

function parseWord(f: FieldSpec, raw: string, what = f.label): string {
  const s = raw.trim();
  if (f.chars && !new RegExp(`^[${f.chars}]*$`).test(s)) {
    const bad = [...s].find((ch) => !new RegExp(`^[${f.chars}]$`).test(ch));
    throw new FieldError(f.key, `${what}: "${bad}" isn't allowed here (allowed: ${f.chars.replace(/\\/g, "")}).`);
  }
  if (f.minLength !== undefined && s.length < f.minLength) throw new FieldError(f.key, f.minLength === 1 ? `${what} can't be empty.` : `${what}: "${s}" is too short (at least ${f.minLength} characters).`);
  if (f.maxLength !== undefined && s.length > f.maxLength) throw new FieldError(f.key, `${what}: "${s.slice(0, 12)}…" is too long (at most ${f.maxLength} characters).`);
  return s;
}

function countCheck(f: FieldSpec, n: number, noun: string) {
  if (f.minItems !== undefined && n < f.minItems) throw new FieldError(f.key, `${f.label} needs at least ${plural(f.minItems, noun)}.`);
  if (f.maxItems !== undefined && n > f.maxItems) throw new FieldError(f.key, `${f.label} can have at most ${plural(f.maxItems, noun)} (you have ${n}), so the walkthrough stays readable.`);
}

export function parseValue(f: FieldSpec, raw: string): unknown {
  switch (f.kind) {
    case "int":
      return parseInt_(f, raw);
    case "letter":
      return parseLetter(f, raw);
    case "bool":
      return raw === "true";
    case "text":
      return parseWord(f, raw);
    case "ints": {
      const t = tokens(raw);
      countCheck(f, t.length, "number");
      return t.map((s) => parseInt_(f, s));
    }
    case "tree": {
      const t = tokens(raw);
      countCheck(f, t.length, "value");
      const out = t.map((s) => (/^(null|_|-)$/i.test(s) ? null : parseInt_(f, s)));
      if (out[0] === null) throw new FieldError(f.key, `${f.label}: the first value is the root, so it can't be null.`);
      return out;
    }
    case "words": {
      const t = tokens(raw);
      countCheck(f, t.length, "word");
      return t.map((s) => parseWord(f, s));
    }
    case "lines": {
      const t = raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
      countCheck(f, t.length, "line");
      return t.map((s, i) => parseWord(f, s, `${f.label}, line ${i + 1}`));
    }
    case "rows": {
      let rows: string[][];
      const s = raw.trim();
      if (s.startsWith("[[")) {
        let data: unknown;
        try {
          data = JSON.parse(s);
        } catch {
          throw new FieldError(f.key, `${f.label}: that looks like JSON but doesn't parse. Or write one item per line, values separated by spaces.`);
        }
        if (!Array.isArray(data) || !data.every(Array.isArray)) throw new FieldError(f.key, `${f.label}: expected a list of lists.`);
        rows = (data as unknown[][]).map((r) => r.map(String));
      } else {
        rows = s
          .split(/\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => (/^(-|\[\s*\]|∅|empty)$/i.test(l) ? [] : tokens(l)));
      }
      countCheck(f, rows.length, "line");
      return rows.map((r, i) => {
        const where = `${f.label}, line ${i + 1}`;
        if (f.cols) {
          if (r.length !== f.cols.length) throw new FieldError(f.key, `${where} needs ${f.cols.length} values${f.colNames ? ` (${f.colNames.join(" ")})` : ""}, not ${r.length}.`);
          return r.map((x, c) => (f.cols![c] === "int" ? parseInt_(f, x, where) : f.cols![c] === "letter" ? parseLetter(f, x, where, 9) : parseWord(f, x, where)));
        }
        if (f.maxRow !== undefined && r.length > f.maxRow) throw new FieldError(f.key, `${where} has ${r.length} numbers, but at most ${f.maxRow} fit.`);
        return r.map((x) => parseInt_(f, x, where));
      });
    }
    case "json": {
      if (raw.length > 800) throw new FieldError(f.key, `${f.label} is too long for a walkthrough.`);
      try {
        return JSON.parse(raw);
      } catch {
        throw new FieldError(f.key, `${f.label} isn't valid JSON.`);
      }
    }
  }
}

/** Parses every visible field. Throws FieldError (with the field key) on the first problem. */
export function parseInput(fields: FieldSpec[], values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.key] = parseValue(f, values[f.key] ?? "");
  return out;
}
