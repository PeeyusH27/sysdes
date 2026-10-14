"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CODE_LANG_LABELS, setCodeLang, useCodeLang, type CodeLang } from "@/lib/code-lang";
import { CopyButton } from "./CopyButton";

export type CodeTab = { name: string; html: string; raw: string };
/** One language's files. A <CodeTabs> with a single set shows no language switch. */
export type CodeTabSet = { lang: CodeLang; tabs: CodeTab[] };

/** Roving focus: arrows wrap, Home/End jump. `vertical` also maps Up/Down (radio groups do, tab rows don't). */
function moveIndex(e: KeyboardEvent, i: number, n: number, vertical = false) {
  const next = vertical && e.key === "ArrowDown" ? "ArrowRight" : vertical && e.key === "ArrowUp" ? "ArrowLeft" : e.key;
  if (next === "ArrowRight") return (i + 1) % n;
  if (next === "ArrowLeft") return (i - 1 + n) % n;
  if (next === "Home") return 0;
  if (next === "End") return n - 1;
  return null;
}

export function CodeTabsClient({ sets }: { sets: CodeTabSet[] }) {
  const uid = useId();
  const chosen = useCodeLang();
  // A block that doesn't offer the reader's language shows its first one; the preference is kept.
  const set = sets.find((s) => s.lang === chosen) ?? sets[0];
  const [fileOf, setFileOf] = useState<Partial<Record<CodeLang, number>>>({});
  const active = Math.min(fileOf[set.lang] ?? 0, set.tabs.length - 1);
  const tab = set.tabs[active];
  const multi = sets.length > 1;
  const langRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pickLang = (i: number, focus: boolean) => {
    setCodeLang(sets[i].lang);
    if (focus) langRefs.current[i]?.focus();
  };
  const pickFile = (i: number, focus: boolean) => {
    setFileOf((f) => ({ ...f, [set.lang]: i }));
    if (focus) tabRefs.current[i]?.focus();
  };
  const tabId = (i: number) => `${uid}-${set.lang}-tab-${i}`;
  const panelId = `${uid}-${set.lang}-panel`;
  const copy = <CopyButton key={`${set.lang}-${active}`} text={tab.raw} label={tab.name} />;

  return (
    <div className={multi ? "code-block code-tabs code-tabs--langs" : "code-block code-tabs"} data-lang={set.lang}>
      {multi && (
        <div className="code-tabs__head">
          <div role="radiogroup" aria-label="Code language" className="code-lang">
            {sets.map((s, i) => (
              <button
                key={s.lang}
                ref={(el) => {
                  langRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={s.lang === set.lang}
                tabIndex={s.lang === set.lang ? 0 : -1}
                onClick={() => pickLang(i, false)}
                onKeyDown={(e) => {
                  const next = moveIndex(e, i, sets.length, true);
                  if (next === null) return;
                  e.preventDefault();
                  pickLang(next, true);
                }}
              >
                {CODE_LANG_LABELS[s.lang]}
              </button>
            ))}
          </div>
          {copy}
        </div>
      )}
      <div className="code-tabs__bar">
        <div role="tablist" aria-label={multi ? `${CODE_LANG_LABELS[set.lang]} files` : "Code files"}>
          {set.tabs.map((t, i) => (
            <button
              key={i}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={i === active}
              aria-controls={panelId}
              tabIndex={i === active ? 0 : -1}
              onClick={() => pickFile(i, false)}
              onKeyDown={(e) => {
                const next = moveIndex(e, i, set.tabs.length);
                if (next === null) return;
                e.preventDefault();
                pickFile(next, true);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
        {!multi && copy}
      </div>
      {/* One panel shows the visible file; keyed so a new file starts scrolled to the top. The panel
          scrolls (long files stay inside the sticky code column), so it takes focus for keyboard scrolling. */}
      <div
        key={`${set.lang}-${active}`}
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(active)}
        tabIndex={0}
        className="code-tabs__panel"
        dangerouslySetInnerHTML={{ __html: tab.html }}
      />
    </div>
  );
}
