import { test, expect } from "vitest";
import { advance, buildTrie, cleanWord, emptyTrie, insert, insertNow, layoutTrie, scanCost, search, startsWith, subtree, trieSteps, walk, wildcard, wordOf, wordsBelow } from "../TrieLab";

const WORDS = ["car", "cat", "cart", "dog", "care", "do", "tea", "ten", "tent", "to"];
const t = buildTrie(WORDS);
const prefixes = (ws: string[]) => new Set(ws.flatMap((w) => Array.from({ length: w.length + 1 }, (_, i) => w.slice(0, i))));

test("one node per distinct prefix (the root is the empty prefix)", () => {
  expect(t.length).toBe(prefixes(WORDS).size);
  expect(buildTrie(["car", "cart"]).length).toBe(5); // root c a r t: "car" reuses everything
  for (let i = 1; i < t.length; i++) expect(t[t[i].parent].kids[t[i].ch]).toBe(i);
});

test("search and startsWith agree with a brute force over the word list", () => {
  const probes = [...prefixes(WORDS), "cow", "carts", "x", "tenth", "d"];
  for (const p of probes) {
    expect(search(t, p), p).toBe(WORDS.includes(p));
    expect(startsWith(t, p), p).toBe(WORDS.some((w) => w.startsWith(p)));
  }
  expect(search(buildTrie(["apple"]), "app")).toBe(false);
  expect(startsWith(buildTrie(["apple"]), "app")).toBe(true);
});

test("completions are exactly the words with that prefix, in alphabetical order", () => {
  for (const p of ["", "c", "ca", "car", "t", "te", "do", "z"]) {
    const r = walk(t, p);
    const got = r.node === null ? [] : wordsBelow(t, r.node);
    expect(got, p).toEqual(WORDS.filter((w) => w.startsWith(p)).sort());
  }
  expect(wordsBelow(t, walk(t, "c").node!, 2)).toEqual(["car", "care"]);
});

test("the walk stops at the first missing letter, so lookups never exceed the prefix length", () => {
  expect(walk(t, "cow")).toMatchObject({ node: null, failAt: 1 });
  expect(trieSteps(t, "cow")).toBe(2);
  expect(trieSteps(t, "cart")).toBe(4);
  for (const p of ["c", "ca", "tent", "dogs", "zzz"]) expect(trieSteps(t, p)).toBeLessThanOrEqual(p.length);
});

test("wildcard search matches the same words as a regular expression", () => {
  for (const pat of ["c.t", "..t", "t..", ".", "....", "d.", ".o", "c.r."]) {
    const re = new RegExp(`^${pat}$`);
    expect(wildcard(t, pat).matches.map((i) => wordOf(t, i)).sort(), pat).toEqual(WORDS.filter((w) => re.test(w)).sort());
  }
  // a letter follows one edge: no dots means the walk visits exactly the path
  expect(wildcard(t, "cat").visited).toEqual(walk(t, "cat").path);
});

test("scanCost counts letter comparisons of the brute force", () => {
  expect(scanCost(["car", "dog"], "ca")).toBe(2 + 1);
  expect(scanCost(["a"], "ab")).toBe(1);
  expect(scanCost(WORDS, "")).toBe(0);
});

test("insert reports the reused path and the new nodes; layout puts parents over their children", () => {
  const r = insert(buildTrie(["car"]), "cart");
  expect(r.path.map((i) => wordOf(r.trie, i))).toEqual(["", "c", "ca", "car", "cart"]);
  expect(r.created).toHaveLength(1);
  const lay = layoutTrie(t);
  for (let i = 0; i < t.length; i++) {
    const ks = Object.values(t[i].kids).map((k) => lay.pos[k].x);
    if (ks.length) expect(lay.pos[i].x).toBe((Math.min(...ks) + Math.max(...ks)) / 2);
  }
  expect(subtree(t, walk(t, "car").node!).map((i) => wordOf(t, i)).sort()).toEqual(["car", "care", "cart"]);
});

test("the insert animation grows one node per step and only then marks the word", () => {
  let s = { trie: emptyTrie(), words: [] as string[], todo: ["to"], ins: null, acc: 0, msg: "" } as Parameters<typeof advance>[0];
  s = advance(s); // start
  expect(s.ins?.k).toBe(0);
  s = advance(advance(s)); // t, o
  expect(s.ins?.k).toBe(2);
  s = advance(s); // finish
  expect(s.ins).toBeNull();
  expect(s.words).toEqual(["to"]);
  const again = insertNow(s, "to");
  expect(again.trie).toBe(s.trie); // duplicates add nothing
  expect(insertNow(s, "tea").words).toEqual(["to", "tea"]);
});

test("edge cases: empty trie, empty query, odd input", () => {
  const e = emptyTrie();
  expect(search(e, "")).toBe(false);
  expect(startsWith(e, "")).toBe(true);
  expect(wordsBelow(e, 0)).toEqual([]);
  expect(cleanWord("Hello, World!")).toBe("hellowor");
  expect(cleanWord("123")).toBe("");
});
