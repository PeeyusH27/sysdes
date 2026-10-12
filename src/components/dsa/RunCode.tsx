import path from "node:path";
import { highlight } from "@/lib/shiki";
import { loadRunnable } from "@/lib/dsa/snippet";
import { RunCodeClient } from "./RunCodeClient";

/**
 * MDX: <RunCode src="snippets/map-basics.js" />. A highlighted snippet with a Run button that executes it in a
 * Web Worker and prints its console output; "Edit" turns it into an editor to experiment.
 */
export async function RunCode({ base, src, title }: { base?: string; src: string; title?: string }) {
  const { code, prelude } = loadRunnable(path.join(process.cwd(), "content", base ?? "", src));
  const html = await highlight(code, "js");
  return <RunCodeClient code={code} prelude={prelude} html={html} title={title ?? src.split("/").pop()!} />;
}
