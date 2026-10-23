"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleCheck, Timer } from "lucide-react";
import { useDsa } from "@/lib/dsa/store";
import { MOCK_LABEL } from "@/lib/prep/mock";
import { useMock } from "@/lib/prep/mock-store";
import { useHydrated } from "@/lib/hooks";

const mmss = (ms: number) => `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor((Math.max(0, ms) % 60000) / 1000)).padStart(2, "0")}`;

/** The floating timer of a mock round: time left, the round's items, and a way to finish. Mounted once in the layout. */
export function MockBar() {
  const hydrated = useHydrated();
  const router = useRouter();
  const path = usePathname();
  const active = useMock((s) => s.active);
  const finish = useMock((s) => s.finish);
  const abandon = useMock((s) => s.abandon);
  const solved = useDsa((s) => s.solved);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const left = active ? active.startedAt + active.durationMs - now : 0;
  useEffect(() => {
    if (active && left <= 0) {
      finish(true);
      router.push("/mock/debrief");
    }
  }, [active, left, finish, router]);

  if (!hydrated || !active || path === "/mock" || path === "/mock/debrief") return null;

  const low = left < 5 * 60_000;
  return (
    <aside className="mockbar card" role="region" aria-label="Mock round">
      <p className="mockbar-head">
        <Timer size={14} aria-hidden /> <b>{MOCK_LABEL[active.type]}</b>
        <span className="mockbar-time" data-low={low || undefined} role="timer" aria-live="off">
          {mmss(left)}
        </span>
      </p>
      <ul className="mockbar-items">
        {active.items.map((i) => (
          <li key={i.slug}>
            <Link href={i.href} aria-current={path === i.href ? "page" : undefined}>
              {i.kind !== "challenge" && solved[i.key] && solved[i.key] >= active.startedAt ? <CircleCheck size={13} aria-hidden className="ok-ink" /> : null} {i.title}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mockbar-actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            finish(false);
            router.push("/mock/debrief");
          }}
        >
          Finish round
        </button>
        <button type="button" className="btn btn-sm" onClick={() => window.confirm("Abandon this round? It will not be scored.") && abandon()}>
          Abandon
        </button>
      </div>
    </aside>
  );
}
