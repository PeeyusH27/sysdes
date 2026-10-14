import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const HIDE = /\/\/\s*@hide\s*$/;
const LOCAL_IMPORT = /^\s*import\s+[^'"]*from\s+['"](\.\.?\/[^'"]+)['"];?\s*(\/\/\s*@hide)?\s*$/;

const asScript = (src: string) => src.replace(/^export\s+(default\s+)?/gm, "");

/**
 * Prepares a snippet for <RunCode>. The file runs as a plain script, so `export` is dropped. A hidden local import
 * (`import { pairSum } from "./pair-sum.js"; // @hide`) is inlined as an invisible prelude: the demo shows only the
 * calls, while the tested template it imports runs first. Templates' own local imports are inlined before them,
 * each file once.
 */
export function loadRunnable(file: string) {
  const seen = new Set<string>();
  const prelude: string[] = [];
  const inline = (target: string) => {
    if (seen.has(target)) return;
    seen.add(target);
    const lines = readFileSync(target, "utf8").split("\n");
    for (const line of lines) {
      const m = LOCAL_IMPORT.exec(line);
      if (m) inline(path.join(path.dirname(target), m[1]));
    }
    prelude.push(asScript(lines.filter((l) => !LOCAL_IMPORT.test(l) && !/^\s*import\s/.test(l)).join("\n")));
  };
  const shown: string[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = LOCAL_IMPORT.exec(line);
    if (m && HIDE.test(line)) inline(path.join(path.dirname(file), m[1]));
    else if (!HIDE.test(line)) shown.push(line);
  }
  return { prelude: prelude.join("\n").trim(), code: asScript(shown.join("\n")).trim() };
}

const HIDE_PY = /#\s*@hide\s*$/;

/**
 * Prepares a Python snippet for <RunCode python="…">. Lines ending in `# @hide` (imports of the sibling templates) are
 * hidden from the reader but run first, as `prelude`. The sibling .py files (tests excluded) come along as `modules`,
 * which the Python worker writes into its file system so those imports resolve.
 */
export function loadRunnablePy(file: string) {
  const prelude: string[] = [];
  const shown: string[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) (HIDE_PY.test(line) ? prelude : shown).push(line);
  const dir = path.dirname(file);
  const modules: Record<string, string> = {};
  for (const f of readdirSync(dir).sort()) {
    if (f.endsWith(".py") && !f.startsWith("test_") && path.join(dir, f) !== file) modules[f] = readFileSync(path.join(dir, f), "utf8");
  }
  return { prelude: prelude.join("\n").trim(), code: shown.join("\n").trim(), modules };
}

/** A read-only snippet (Java on a runnable block): `// @hide` and `// @display-only` lines are dropped, as in CodeBlock. */
export function loadShownOnly(file: string) {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => !/(?:^|\s)(?:\/\/|#)\s*@hide\s*$/.test(l) && !/^\s*(?:\/\/|#)\s*@display-only/.test(l))
    .join("\n")
    .trim();
}
