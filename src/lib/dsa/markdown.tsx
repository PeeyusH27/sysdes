import "server-only";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { useMDXComponents } from "@/mdx-components";

/**
 * Renders plain Markdown (not MDX: `<` and `{` are just text) with the site's prose components, so fenced code is
 * highlighted by Shiki and tables get the styled wrapper. Used for problem statements and solutions.
 */
export async function Markdown({ source }: { source: string }) {
  if (!source.trim()) return null;
  const { default: Content } = await evaluate(source, { ...runtime, format: "md", remarkPlugins: [remarkGfm] });
  // Not a hook here: it just returns the static component map.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return <Content components={useMDXComponents()} />;
}
