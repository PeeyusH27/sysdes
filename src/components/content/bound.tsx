import type { MDXComponents } from "mdx/types";
import { CodeBlock, CodeTabs } from "./CodeBlock";
import { RunCode } from "@/components/dsa/RunCode";

/** Lets MDX say <CodeTabs files={['snippets/x.js']} /> relative to its own folder. */
export function boundComponents(base: string): MDXComponents {
  return {
    CodeBlock: (p: Parameters<typeof CodeBlock>[0]) => <CodeBlock base={base} {...p} />,
    CodeTabs: (p: Parameters<typeof CodeTabs>[0]) => <CodeTabs base={base} {...p} />,
    RunCode: (p: Parameters<typeof RunCode>[0]) => <RunCode base={base} {...p} />,
  } as MDXComponents;
}
