import path from "node:path";
import { highlight } from "@/lib/shiki";
import { loadRunnable, loadRunnablePy, loadShownOnly } from "@/lib/dsa/snippet";
import { RunCodeClient } from "./RunCodeClient";

const name = (file: string) => file.split("/").pop()!;

/**
 * MDX: <RunCode src="snippets/try-it.js" python="snippets/python/try_it.py" java="snippets/java/TryIt.java" />.
 * A highlighted snippet with a Run button that executes it in a Web Worker and prints its output; "Edit" turns it into
 * an editor to experiment. `python` and `java` (paths relative to the page folder, like `src`) add a language switch
 * that follows the site-wide choice: Python runs in the browser (Pyodide), Java is shown read-only.
 */
export async function RunCode({ base, src, title, python, java }: { base?: string; src: string; title?: string; python?: string; java?: string }) {
  const dir = path.join(process.cwd(), "content", base ?? "");
  const { code, prelude } = loadRunnable(path.join(dir, src));
  const html = await highlight(code, "js", { focusable: true });

  let py: { code: string; prelude: string; modules: Record<string, string>; html: string; title: string } | undefined;
  if (python) {
    const r = loadRunnablePy(path.join(dir, python));
    // The Python harness imports sibling templates by module name.
    const modules = Object.fromEntries(Object.entries(r.modules).map(([f, source]) => [f.replace(/\.py$/, ""), source]));
    py = { code: r.code, prelude: r.prelude, modules, html: await highlight(r.code, "python", { focusable: true }), title: name(python) };
  }

  let jv: { code: string; html: string; title: string } | undefined;
  if (java) {
    const source = loadShownOnly(path.join(dir, java));
    jv = { code: source, html: await highlight(source, "java", { focusable: true }), title: name(java) };
  }

  return <RunCodeClient code={code} prelude={prelude} html={html} title={title ?? name(src)} python={py} java={jv} />;
}
