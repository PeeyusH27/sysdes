import type { MetadataRoute } from "next";
import { allPages } from "@content/registry";
import { problemSlugs } from "@/lib/dsa/load";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = [
    "/",
    "/system-design",
    "/learn",
    "/deep-dives",
    "/questions",
    "/dsa",
    "/dsa/js",
    "/dsa/patterns",
    "/dsa/problems",
    "/shorts",
    ...allPages()
      .map((p) => p.href)
      .filter((h) => !h.includes("#")),
    ...problemSlugs().map((s) => `/dsa/problems/${s}`),
  ];
  return [...new Set(paths)].map((path) => ({ url: `${base}${path}` }));
}
