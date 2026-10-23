import { buildCatalog } from "@/lib/prep/catalog";
import { PlanClient } from "./client";

export const metadata = {
  title: "Interview plan and readiness",
  description: "See how interview-ready you are in coding, system design and low-level design, and get a week-by-week plan built from your own progress and deadline.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return <PlanClient catalog={buildCatalog()} />;
}
