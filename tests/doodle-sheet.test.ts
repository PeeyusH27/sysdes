// A contact sheet for reviewing doodles without building the site. Skipped unless DOODLE_SHEET is set:
//   DOODLE_SHEET=/some/dir/sheet.html DOODLES=cache,queue npx vitest run tests/doodle-sheet.test.ts
//   node scripts/shot-html.mjs /some/dir/sheet.html /some/dir/sheet.png
// DOODLES defaults to every drawn doodle. The CSS is the real one from src/app/globals.css.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Doodle } from "@/components/doodle/Doodle";
import { arts } from "@/components/doodle/registry";
import type { DoodleName } from "@/components/doodle/names";

const out = process.env.DOODLE_SHEET;

it.skipIf(!out)("writes the contact sheet", () => {
  const css = readFileSync(path.resolve(__dirname, "../src/app/globals.css"), "utf8");
  const rules = css.slice(css.indexOf("/* ------------------------------------------------------------------ doodles and sketch style */"));
  const names = (process.env.DOODLES ? process.env.DOODLES.split(",") : Object.keys(arts)).filter((n) => arts[n]) as DoodleName[];
  const cells = names.map((n) => `<li>${renderToStaticMarkup(createElement(Doodle, { name: n, size: 220, caption: true, label: true }))}<code>${n}</code></li>`).join("");
  const vars = (t: string) => `:root[data-theme=${t}]`;
  const html = `<!doctype html><meta charset="utf-8"><style>
:root{--fg:#17211e;--muted:#586861;--accent:#0b7a63;--accent-2:#a35f00;--card:#fff;--border:#d6dfdb;--font-hand:'Bradley Hand','Segoe Print','Comic Sans MS',cursive}
body{margin:0;padding:20px;background:#f3f6f4;font:14px system-ui}
${vars("dark")}{--fg:#e8efec;--muted:#92a39d;--accent:#46d6b4;--accent-2:#f4b95a;--card:#141d1b;--border:#243230}
body[data-theme=dark]{background:#0b1110;color:#e8efec}
${rules}</style>
<body data-theme="${process.env.DOODLE_THEME ?? "light"}"><script>document.documentElement.dataset.theme=document.body.dataset.theme</script>
<ul class="doodle-grid">${cells}</ul></body>`;
  writeFileSync(out!, html);
});
