import "server-only";
import { createHighlighter, type Highlighter } from "shiki";

const LANGS = ["js", "jsx", "ts", "tsx", "sql", "lua", "json", "bash", "http", "yaml", "ini", "text"] as const;
let highlighter: Promise<Highlighter> | undefined;

const ALIASES: Record<string, string> = { javascript: "js", typescript: "ts", sh: "bash", shell: "bash", conf: "ini", cql: "sql", txt: "text", plaintext: "text", mjs: "js", cjs: "js" };

export async function highlight(code: string, lang = "js") {
  highlighter ??= createHighlighter({ themes: ["github-light", "github-dark"], langs: [...LANGS] });
  const l = ALIASES[lang] ?? lang;
  const h = await highlighter;
  return h.codeToHtml(code, {
    lang: (LANGS as readonly string[]).includes(l) ? l : "text",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
