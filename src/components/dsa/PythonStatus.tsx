"use client";
import { CloudOff, Loader2 } from "lucide-react";
import type { PyStatus } from "@/lib/dsa/py-runner";

/** First-load progress (or the reason Python is unavailable). Renders nothing once Python is ready or idle. */
export function PythonStatus({ status, compact = false }: { status: PyStatus; compact?: boolean }) {
  if (status.phase === "error") {
    return (
      <p className="py-status py-status--error" role="alert">
        <CloudOff size={15} aria-hidden /> <span>{status.error}</span>
      </p>
    );
  }
  if (status.phase !== "loading" && status.phase !== "starting") return null;
  const pct = status.phase === "starting" ? 100 : status.total ? Math.round((status.loaded / status.total) * 100) : 0;
  const label = status.restarting ? "Restarting Python…" : status.phase === "starting" ? "Starting Python…" : "Loading Python…";
  return (
    <div className="py-status" role="status">
      <Loader2 size={15} className="spin" aria-hidden />
      <span className="py-status__text">
        <strong>{label}</strong>
        {!status.restarting && !compact && <span className="muted"> About 5 MB, cached after the first time.</span>}
      </span>
      <span className="py-bar" role="progressbar" aria-label="Python download" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
