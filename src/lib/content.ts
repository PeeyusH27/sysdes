import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import GithubSlugger from "github-slugger";

const contentPath = (file: string) => path.join(process.cwd(), "content", file);

export async function readContent(file: string) {
  try {
    return await readFile(contentPath(file), "utf8");
  } catch {
    return "";
  }
}

/** Strip inline markdown so slugs match what rehype-slug computes from the rendered text. */
const inlineText = (s: string) =>
  s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .trim();

/** h2/h3 headings for the "On this page" list (code fences skipped). */
export async function getHeadings(file: string) {
  const src = await readContent(file);
  const slugger = new GithubSlugger();
  const out: { depth: 2 | 3; text: string; id: string }[] = [];
  let fenced = false;
  for (const line of src.split("\n")) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = inlineText(m[2]);
    out.push({ depth: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }
  return out;
}

/** Rough plain text of an MDX file for search (imports, JSX tags and code fences removed). */
export async function mdxToPlainText(file: string) {
  const src = await readContent(file);
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^(import|export)\s.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
