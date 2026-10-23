"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * A technical word with its plain-words meaning one tap away. Inserted by src/lib/mdx/rehype-glossary.mjs the first
 * time a glossary term appears in a section: nobody writes it by hand. Hover, focus or tap opens a small card; Escape
 * or a tap elsewhere closes it. It is a button, so keyboards and screen readers reach it.
 */
export function Term({ term, def, primer, href, children }: { term: string; def: string; primer?: string; href?: string; children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const pointer = useRef<string>("mouse");

  useEffect(() => {
    if (!open) return;
    const rect = box.current?.querySelector(".term-pop")?.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlip(!!rect && rect.right > window.innerWidth - 8);
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span
      ref={box}
      className="term-wrap"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        className="term"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onClick={() => setOpen((o) => (pointer.current === "mouse" ? true : !o))}
      >
        {children}
      </button>
      {open && (
        <span role="tooltip" id={id} className="term-pop" data-flip={flip || undefined}>
          <b>{term}</b> {def}
          {(primer || href) && (
            <span className="term-links">
              {primer && (
                <Link href={`/basics/${primer}`} className="link">
                  See it in a minute
                </Link>
              )}
              {href && (
                <Link href={href} className="link">
                  Read more
                </Link>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
