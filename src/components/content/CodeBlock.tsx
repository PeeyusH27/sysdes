import { readFile } from "node:fs/promises";
import path from "node:path";
import { highlight } from "@/lib/shiki";
import { CopyButton } from "./CopyButton";
import { CodeTabsClient } from "./CodeTabsClient";

/** Lines ending in `// @hide` (imports of test fakes etc.) are dropped from what readers see. */
const clean = (src: string) =>
  src
    .split("\n")
    .filter((l) => !/\/\/\s*@hide\s*$/.test(l) && !/^\s*\/\/\s*@display-only/.test(l))
    .join("\n")
    .trim();

const langOf = (file: string) => {
  const ext = file.split(".").pop() ?? "js";
  return ext === "mjs" ? "js" : ext;
};

async function load(base: string | undefined, file: string) {
  return readFile(path.join(process.cwd(), "content", base ?? "", file), "utf8");
}

export async function CodeBlock({ base, src, code, lang, title }: { base?: string; src?: string; code?: string; lang?: string; title?: string }) {
  const source = clean(code ?? (await load(base, src!)));
  const html = await highlight(source, lang ?? (src ? langOf(src) : "js"));
  const caption = title ?? src?.split("/").pop();
  return (
    <figure className="code-block">
      {caption && <figcaption>{caption}</figcaption>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyButton text={source} />
    </figure>
  );
}

export async function CodeTabs({ base, files, titles }: { base?: string; files: string[]; titles?: string[] }) {
  const tabs = await Promise.all(
    files.map(async (f, i) => {
      const source = clean(await load(base, f));
      return { name: titles?.[i] ?? f.split("/").pop()!, html: await highlight(source, langOf(f)), raw: source };
    }),
  );
  return <CodeTabsClient tabs={tabs} />;
}

/** MDX fenced code blocks: ```js … ``` */
export async function Pre(props: { children?: React.ReactElement<{ className?: string; children?: string }> }) {
  const codeEl = props.children;
  const raw = typeof codeEl?.props?.children === "string" ? codeEl.props.children : "";
  const lang = codeEl?.props?.className?.replace("language-", "") ?? "text";
  const source = raw.replace(/\n$/, "");
  const html = await highlight(source, lang);
  return (
    <figure className="code-block">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyButton text={source} />
    </figure>
  );
}
