import { buildCatalog } from "@/lib/prep/catalog";
import { DebriefClient } from "./client";

export const metadata = { title: "Mock round debrief", robots: { index: false } };

export default function DebriefPage() {
  return <DebriefClient catalog={buildCatalog()} />;
}
