// How hard is the prose to read? Strips code, tables and MDX, then reports words, sentence length and the
// Flesch-Kincaid grade (US school grade needed to read it easily; 8 is plain, 12+ is dense).
//   node scripts/readability.mjs                      every page, as a table
//   node scripts/readability.mjs content/learn/04     only paths containing this
//   node scripts/readability.mjs --json               machine-readable
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "content");

const syllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
};

/** The prose a reader reads: no code blocks, no JSX tags, no tables, no import lines, no inline code. */
export function prose(mdx) {
  return mdx
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^import .*$/gm, " ")
    .replace(/^\|.*\|$/gm, " ")
    .replace(/<[A-Za-z][^>]*\/>/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/`[^`]*`/g, " code ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
}

export function measure(text) {
  const sentences = text.split(/(?<=[.!?])\s+|\n{2,}/).map((s) => s.trim()).filter((s) => /[a-z]/i.test(s));
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const long = words.filter((w) => syllables(w) >= 3).length;
  const wps = sentences.length ? words.length / sentences.length : 0;
  const spw = words.length ? syl / words.length : 0;
  return {
    words: words.length,
    sentences: sentences.length,
    wordsPerSentence: Math.round(wps * 10) / 10,
    longWordPct: words.length ? Math.round((long / words.length) * 100) : 0,
    grade: Math.round((0.39 * wps + 11.8 * spw - 15.59) * 10) / 10,
  };
}

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));

export function pages(filter = "") {
  return walk(root)
    .filter((f) => f.endsWith("page.mdx") || (f.includes("/dsa/js/") && f.endsWith(".mdx")))
    .filter((f) => f.includes(filter))
    .map((f) => ({ file: path.relative(root, f), ...measure(prose(readFileSync(f, "utf8"))) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const rows = pages(args.find((a) => !a.startsWith("--")) ?? "");
  if (json) console.log(JSON.stringify(rows, null, 2));
  else {
    for (const r of rows) console.log(`${r.file.padEnd(58)} ${String(r.words).padStart(5)} words  ${String(r.wordsPerSentence).padStart(5)} w/sent  ${String(r.longWordPct).padStart(3)}% long  grade ${r.grade}`);
    const med = (k) => [...rows].map((r) => r[k]).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
    console.log(`\n${rows.length} pages · median ${med("words")} words · ${med("wordsPerSentence")} words/sentence · grade ${med("grade")} · total ${rows.reduce((n, r) => n + r.words, 0)} words`);
  }
}
