import { readFile } from "node:fs/promises";
import path from "node:path";
import { highlight } from "@/lib/shiki";
import type { CodeLang } from "@/lib/code-lang";
import { CopyButton } from "./CopyButton";
import { CodeTabsClient, type CodeTabSet } from "./CodeTabsClient";

/**
 * Lines ending in `// @hide` or `# @hide` (imports of test fakes etc.) are dropped from what readers see,
 * and so is a `// @display-only` or `# @display-only` header line.
 */
const clean = (src: string) =>
  src
    .split("\n")
    .filter((l) => !/(?:^|\s)(?:\/\/|#)\s*@hide\s*$/.test(l) && !/^\s*(?:\/\/|#)\s*@display-only/.test(l))
    .join("\n")
    .trim();

const EXT_LANG: Record<string, string> = { mjs: "js", cjs: "js", py: "python" };
const langOf = (file: string) => {
  const ext = file.split(".").pop() ?? "js";
  return EXT_LANG[ext] ?? ext;
};

async function load(base: string | undefined, file: string) {
  return readFile(path.join(process.cwd(), "content", base ?? "", file), "utf8");
}

export async function CodeBlock({ base, src, code, lang, title }: { base?: string; src?: string; code?: string; lang?: string; title?: string }) {
  const source = clean(code ?? (await load(base, src!)));
  const html = await highlight(source, lang ?? (src ? langOf(src) : "js"), { focusable: true });
  const caption = title ?? src?.split("/").pop();
  return (
    <figure className="code-block">
      {caption && <figcaption>{caption}</figcaption>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyButton text={source} />
    </figure>
  );
}

type CodeTabsProps = {
  base?: string;
  /** The JavaScript files (paths relative to the page folder). */
  files: string[];
  titles?: string[];
  /** Optional Java and Python versions of the same design. Either one adds a language switch. */
  java?: string[];
  javaTitles?: string[];
  python?: string[];
  pythonTitles?: string[];
};

async function loadSet(base: string | undefined, lang: CodeLang, files: string[], titles?: string[]): Promise<CodeTabSet> {
  const tabs = await Promise.all(
    files.map(async (f, i) => {
      const source = clean(await load(base, f));
      return { name: titles?.[i] ?? f.split("/").pop()!, html: await highlight(source, langOf(f)), raw: source };
    }),
  );
  return { lang, tabs };
}

/**
 * <CodeTabs files={[…]} /> shows one file per tab. Add java={[…]} and/or python={[…]} and readers get a
 * JavaScript | Java | Python switch; the choice is site-wide and remembered (src/lib/code-lang.ts).
 */
export async function CodeTabs({ base, files, titles, java, javaTitles, python, pythonTitles }: CodeTabsProps) {
  const wanted: [CodeLang, string[] | undefined, string[] | undefined][] = [
    ["js", files, titles],
    ["java", java, javaTitles],
    ["python", python, pythonTitles],
  ];
  const sets = await Promise.all(wanted.filter(([, f]) => f?.length).map(([lang, f, t]) => loadSet(base, lang, f!, t)));
  return <CodeTabsClient sets={sets} />;
}

/** MDX fenced code blocks: ```js … ``` */
export async function Pre(props: { children?: React.ReactElement<{ className?: string; children?: string }> }) {
  const codeEl = props.children;
  const raw = typeof codeEl?.props?.children === "string" ? codeEl.props.children : "";
  const lang = codeEl?.props?.className?.replace("language-", "") ?? "text";
  const source = raw.replace(/\n$/, "");
  const html = await highlight(source, lang, { focusable: true });
  return (
    <figure className="code-block">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyButton text={source} />
    </figure>
  );
}
