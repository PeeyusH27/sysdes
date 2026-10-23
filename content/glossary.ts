// Every technical term the site uses, explained in plain words. The data is JSON so the compile-time glossary plugin
// (src/lib/mdx/rehype-glossary.mjs) can read it too: the first time a term appears in a section, it is underlined and
// a tap shows `def`. `aliases` are other ways the term is written; `primer` links to its "What is X?" page; `href` is
// where it is taught; `short` is the id of its one-minute short (/shorts?s=<id>), checked by tests/shorts.test.ts.
import data from "./glossary.json";

export interface GlossaryEntry {
  term: string;
  /** Plain words, one or two short sentences. */
  def: string;
  aliases?: string[];
  primer?: string;
  href?: string;
  short?: string;
}

export const glossary: GlossaryEntry[] = data as GlossaryEntry[];
