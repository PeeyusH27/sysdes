"use client";
import dynamic from "next/dynamic";

// React Flow measures the DOM and the store reads localStorage: render on the client only.
const Playground = dynamic(() => import("@/components/playground/Playground").then((m) => m.Playground), {
  ssr: false,
  loading: () => <p className="container muted" style={{ padding: 24 }}>Loading the playground…</p>,
});

export function PlaygroundClient({ challenge, guided = false }: { challenge?: string; guided?: boolean }) {
  return <Playground challengeSlug={challenge} guided={guided} />;
}
