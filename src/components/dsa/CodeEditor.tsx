"use client";
import { useEffect, useRef } from "react";
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { tags as t } from "@lezer/highlight";

// Colours come from CSS variables (src/app/dsa.css), so the editor follows the light/dark toggle without re-creating.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: "var(--cm-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--cm-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--cm-number)" },
  { tag: [t.lineComment, t.blockComment, t.docComment], color: "var(--cm-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--cm-fn)" },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: "var(--cm-def)" },
  { tag: [t.className, t.typeName, t.definition(t.className)], color: "var(--cm-type)" },
  { tag: [t.self, t.special(t.variableName)], color: "var(--cm-keyword)" },
  { tag: [t.propertyName], color: "var(--cm-prop)" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--cm-punct)" },
]);

const theme = EditorView.theme({
  "&": { backgroundColor: "var(--code-bg)", color: "var(--fg)", fontSize: "13.5px", height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6", overflow: "auto" },
  ".cm-content": { caretColor: "var(--accent)", padding: "10px 0" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "var(--code-bg)", color: "var(--muted)", border: "none", paddingLeft: "4px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--accent) 24%, transparent) !important" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)", outline: "none" },
  ".cm-error-line": { backgroundColor: "color-mix(in srgb, var(--critical) 14%, transparent)" },
});

const setErrorLine = StateEffect.define<number | null>();
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setErrorLine)) continue;
      const n = e.value;
      deco = n && n >= 1 && n <= tr.state.doc.lines ? Decoration.set([Decoration.line({ class: "cm-error-line" }).range(tr.state.doc.line(n).from)]) : Decoration.none;
    }
    return tr.docChanged ? Decoration.none : deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function CodeEditor({
  initial,
  onChange,
  onRun,
  onSubmit,
  errorLine = null,
  label = "Code editor",
  readOnly = false,
  minHeight,
  lang = "js",
}: {
  initial: string;
  onChange?: (code: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  errorLine?: number | null;
  label?: string;
  readOnly?: boolean;
  minHeight?: number;
  /** The editor's language; remount (change `key`) to switch. Python indents by 4 spaces. */
  lang?: "js" | "python";
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Latest callbacks without re-creating the editor.
  const cb = useRef({ onChange, onRun, onSubmit });
  useEffect(() => {
    cb.current = { onChange, onRun, onSubmit };
  });

  useEffect(() => {
    const run = () => (cb.current.onRun?.(), true);
    const submit = () => (cb.current.onSubmit?.(), true);
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      syntaxHighlighting(highlight),
      lang === "python" ? python() : javascript(),
      EditorState.tabSize.of(lang === "python" ? 4 : 2),
      indentUnit.of(lang === "python" ? "    " : "  "),
      keymap.of([
        { key: "Mod-Enter", run: submit, preventDefault: true },
        { key: "Mod-'", run, preventDefault: true },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      theme,
      errorLineField,
      EditorView.contentAttributes.of({ "aria-label": label }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) cb.current.onChange?.(u.state.doc.toString());
      }),
    ];
    if (readOnly) extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
    const v = new EditorView({ state: EditorState.create({ doc: initial, extensions }), parent: host.current! });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor owns its document after mount; remount (change `key`) to load new code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    view.current?.dispatch({ effects: setErrorLine.of(errorLine) });
  }, [errorLine]);

  return <div ref={host} className="code-editor" style={minHeight ? { minHeight } : undefined} />;
}
