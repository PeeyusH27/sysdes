"use client";
import { X } from "lucide-react";
import type { LogLine, ScriptOutcome } from "@/lib/dsa/runner";

export function LogLines({ logs }: { logs: LogLine[] }) {
  return (
    <>
      {logs.map((l, i) => (
        <div key={i} className="log-line" data-level={l.level}>
          {l.level !== "log" && <span className="log-level">{l.level}</span>}
          {l.text}
        </div>
      ))}
    </>
  );
}

/** Output panel under a runnable snippet. */
export function ConsoleOutput({ outcome, onClear }: { outcome: ScriptOutcome; onClear: () => void }) {
  return (
    <div className="console-out" role="log" aria-live="polite" aria-label="Console output">
      <div className="console-head">
        <span>Console · {outcome.ms} ms</span>
        <button type="button" onClick={onClear} aria-label="Clear output">
          <X size={13} aria-hidden />
        </button>
      </div>
      <div className="console-body">
        {outcome.logs.length === 0 && !outcome.error && <div className="log-line muted">(no output)</div>}
        <LogLines logs={outcome.logs} />
        {outcome.error && (
          <div className="log-line" data-level="error">
            <span className="log-level">error</span>
            {/* Python errors carry a traceback through the reader's code, which names the line itself. */}
            {outcome.error.traceback ?? (
              <>
                {outcome.error.name}: {outcome.error.message}
                {outcome.error.line ? ` (line ${outcome.error.line})` : ""}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
