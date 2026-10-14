"use client";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** `label` names what gets copied (e.g. a file name) for screen readers: "Copy ParkingLot.java". */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
      aria-label={copied ? "Copied" : label ? `Copy ${label}` : "Copy code"}
    >
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
