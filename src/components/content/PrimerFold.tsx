"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const KEY = "sds-primers-closed";
const OPENED = "sds-primers-opened";
const read = (key = KEY): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
};

/**
 * The fold around a lesson's primer: open the first time, and it stays closed once you have closed it. On a page that
 * opens on a walkthrough (`startClosed`) it is the other way round: closed until you open it.
 */
export function PrimerFold({ id, title, startClosed = false, children }: { id: string; title: string; startClosed?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!startClosed);
  const key = startClosed ? OPENED : KEY;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(startClosed ? read(OPENED).includes(id) : !read().includes(id));
  }, [id, startClosed]);
  return (
    <section className="primer-fold" data-open={open || undefined} aria-label={title}>
      <button
        type="button"
        className="primer-fold-head"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          try {
            const rest = read(key).filter((x) => x !== id);
            const keep = startClosed ? next : !next;
            localStorage.setItem(key, JSON.stringify(keep ? [...rest, id] : rest));
          } catch {
            /* private mode: it just resets next visit */
          }
        }}
      >
        <span className="eyebrow">New to this? One minute</span>
        <b>{title}</b>
        <ChevronDown size={16} aria-hidden className="primer-chev" />
      </button>
      {open && children}
    </section>
  );
}
