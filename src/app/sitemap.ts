import type { MetadataRoute } from "next";
import { allPages } from "@content/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["/", "/learn", "/deep-dives", "/questions", ...allPages().map((p) => p.href)].map((path) => ({ url: `${base}${path}` }));
}
