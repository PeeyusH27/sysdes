"use client";
import { useRef, type KeyboardEvent } from "react";
import { CODE_LANG_LABELS, type CodeLang } from "@/lib/code-lang";

/** Arrow keys move the choice (and wrap); Home/End jump to the ends. */
function step(key: string, i: number, n: number) {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n;
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}

/**
 * The JavaScript | Java | Python switch of the practice editor and of runnable snippets, styled like <CodeTabs>'
 * (`.code-lang` in code.css). A radio group: one tab stop, arrows move the choice.
 */
export function LangSwitch<L extends CodeLang>({ langs, value, onPick, disabled = false, className = "" }: { langs: readonly L[]; value: L; onPick: (lang: L) => void; disabled?: boolean; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const to = step(e.key, i, langs.length);
    if (to === null || disabled) return;
    e.preventDefault();
    onPick(langs[to]);
    refs.current[to]?.focus();
  };
  return (
    <span role="radiogroup" aria-label="Code language" className={`code-lang ${className}`.trim()}>
      {langs.map((l, i) => (
        <button
          key={l}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={l === value}
          tabIndex={l === value ? 0 : -1}
          disabled={disabled && l !== value}
          onClick={() => onPick(l)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {CODE_LANG_LABELS[l]}
        </button>
      ))}
    </span>
  );
}
