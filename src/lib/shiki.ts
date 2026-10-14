import "server-only";
import { createHighlighter, type Highlighter, type ShikiTransformer } from "shiki";

const THEMES = { light: "github-light", dark: "github-dark" } as const;
const LANGS = ["js", "jsx", "ts", "tsx", "java", "python", "sql", "lua", "json", "bash", "http", "yaml", "ini", "text"] as const;
let highlighter: Promise<Highlighter> | undefined;

const ALIASES: Record<string, string> = {
  javascript: "js", typescript: "ts", sh: "bash", shell: "bash", conf: "ini", cql: "sql", txt: "text", plaintext: "text",
  mjs: "js", cjs: "js", py: "python", python3: "python",
};

const resolve = (lang: string) => {
  const l = ALIASES[lang] ?? lang;
  return (LANGS as readonly string[]).includes(l) ? l : "text";
};

// A code block scrolls sideways when its lines are wider than the column, so keyboard users must be able to focus it.
const focusablePre: ShikiTransformer = {
  pre(node) {
    node.properties.tabindex = "0";
  },
};

/**
 * Dual-theme (light/dark) HTML for a code string. `focusable: true` puts the <pre> in the tab order, for callers
 * whose <pre> is its own scroll container (CodeBlock, fenced code). CodeTabs scrolls a focusable panel instead.
 */
export async function highlight(code: string, lang = "js", { focusable = false }: { focusable?: boolean } = {}) {
  highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [...LANGS] });
  const h = await highlighter;
  return h.codeToHtml(code, {
    lang: resolve(lang),
    themes: THEMES,
    defaultColor: false,
    transformers: focusable ? [focusablePre] : [],
  });
}

/** Like `highlight`, but every line gets data-line="n" (1-based) so a player can mark the current line. */
export async function highlightLines(code: string, lang = "js") {
  highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [...LANGS] });
  const h = await highlighter;
  return h.codeToHtml(code, {
    lang: resolve(lang),
    themes: THEMES,
    defaultColor: false,
    transformers: [
      {
        // The panel scrolls, so keyboard users must be able to focus it.
        pre(node) {
          node.properties.tabindex = "0";
          node.properties["aria-label"] = "Code";
        },
        line(node, line) {
          node.properties["data-line"] = line;
        },
      },
    ],
  });
}
