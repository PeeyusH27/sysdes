import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Lets several local builds coexist (e.g. NEXT_DIST_DIR=.next-layout); defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentUpgrade: "latest",
  },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Turbopack needs remark/rehype plugins as strings (they run in Rust land). A string is resolved from each MDX
// file's folder, so local plugins must be absolute paths.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug", path.join(process.cwd(), "src/lib/mdx/rehype-glossary.mjs"), path.join(process.cwd(), "src/lib/mdx/rehype-section-cards.mjs")],
  },
});

export default withMDX(nextConfig);
