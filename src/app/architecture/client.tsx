"use client";
import dynamic from "next/dynamic";

// React Flow measures the DOM: render on the client only.
const ArchitectureLab = dynamic(() => import("@/components/arch/ArchitectureLab").then((m) => m.ArchitectureLab), {
  ssr: false,
  loading: () => <p className="container muted" style={{ padding: 24 }}>Loading the lab…</p>,
});

export function LabClient() {
  return <ArchitectureLab />;
}
