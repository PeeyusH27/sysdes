import { Suspense } from "react";
import { buildCatalog } from "@/lib/prep/catalog";
import { MockClient } from "./client";

export const metadata = {
  title: "Mock interview rounds",
  description: "Timed practice rounds for coding, system design and low-level design, with hints held back and a debrief that says what to fix.",
  alternates: { canonical: "/mock" },
};

export default function MockPage() {
  return (
    <Suspense fallback={<p className="container muted">Loading…</p>}>
      <MockClient catalog={buildCatalog()} />
    </Suspense>
  );
}
