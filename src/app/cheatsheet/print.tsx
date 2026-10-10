"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-sm no-print" style={{ marginTop: 14 }} onClick={() => window.print()}>
      <Printer size={15} aria-hidden /> Print or save as PDF
    </button>
  );
}
