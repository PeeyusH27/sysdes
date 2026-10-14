"use client";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** The languages a multi-language <CodeTabs> can offer, in switch order. */
export const CODE_LANGS = ["js", "java", "python"] as const;
export type CodeLang = (typeof CODE_LANGS)[number];
export const CODE_LANG_LABELS: Record<CodeLang, string> = { js: "JavaScript", java: "Java", python: "Python" };

export const isCodeLang = (v: unknown): v is CodeLang => (CODE_LANGS as readonly unknown[]).includes(v);

const STORAGE_KEY = "sds-code-lang";

type CodeLangState = { lang: CodeLang; setLang: (lang: CodeLang) => void };

/** The reader's code language: one site-wide choice, persisted like src/lib/progress.ts. */
export const useCodeLangStore = create<CodeLangState>()(
  persist((set) => ({ lang: "js", setLang: (lang) => set({ lang }) }), {
    name: STORAGE_KEY,
    version: 1,
    // A stale or hand-edited value falls back to JavaScript instead of breaking every code block.
    merge: (persisted, current) => {
      const lang = (persisted as Partial<CodeLangState> | undefined)?.lang;
      return { ...current, lang: isCodeLang(lang) ? lang : current.lang };
    },
  }),
);

// Another tab changed the language: follow it.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) void useCodeLangStore.persist.rehydrate();
  });
}

const subscribe = (onChange: () => void) => useCodeLangStore.subscribe(onChange);
const getSnapshot = () => useCodeLangStore.getState().lang;
const getServerSnapshot = (): CodeLang => "js";

/**
 * The chosen language. The server render and the hydration pass both see "js", so the HTML always
 * matches; React re-renders with the stored choice right after hydration. A page reached by client
 * navigation reads the stored choice on its first render, so it never flashes JavaScript.
 */
export function useCodeLang(): CodeLang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const setCodeLang = (lang: CodeLang) => useCodeLangStore.getState().setLang(lang);

/** The languages that run in the browser (the practice editor, runnable snippets). Java is shown, not run. */
export const RUNNABLE_LANGS = ["js", "python"] as const;
export type RunnableLang = (typeof RUNNABLE_LANGS)[number];
export const isRunnableLang = (v: unknown): v is RunnableLang => (RUNNABLE_LANGS as readonly unknown[]).includes(v);
