import { arr, defineTrace, graph, note } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

// ------------------------------------------------------------------ a tiny trie the traces manipulate
interface TNode {
  id: string; // "^" + the prefix that leads here, so ids are unique and readable
  children: Map<string, TNode>;
  isEnd: boolean;
}
const makeNode = (prefix: string): TNode => ({ id: `^${prefix}`, children: new Map(), isEnd: false });

/**
 * Fixed positions for every node of the trie that will exist once all words are in, so nodes never jump while the
 * trie grows: leaves get evenly spaced columns, a parent sits above the middle of its children, depth sets the row.
 */
function layout(words: string[]) {
  const root = makeNode("");
  for (const w of words) {
    let n = root;
    for (let i = 0; i < w.length; i++) {
      if (!n.children.has(w[i])) n.children.set(w[i], makeNode(w.slice(0, i + 1)));
      n = n.children.get(w[i])!;
    }
  }
  const maxDepth = Math.max(1, ...words.map((w) => w.length));
  const raw = new Map<string, { x: number; depth: number }>();
  let col = 0;
  const place = (n: TNode, depth: number): number => {
    const kids = [...n.children.keys()].sort().map((k) => n.children.get(k)!);
    const x = kids.length ? kids.map((k) => place(k, depth + 1)).reduce((a, b, _, all) => a + b / all.length, 0) : col++;
    raw.set(n.id, { x, depth });
    return x;
  };
  place(root, 0);
  const span = Math.max(1, col - 1);
  const pos = new Map<string, { x: number; y: number }>();
  for (const [id, p] of raw) pos.set(id, { x: col === 1 ? 50 : Math.round(8 + (84 * p.x) / span), y: Math.round((100 * p.depth) / maxDepth) });
  return pos;
}

/** Draws the nodes that exist right now (reachable from root), at their fixed positions. */
function drawTrie(
  root: TNode,
  pos: Map<string, { x: number; y: number }>,
  o: { tones?: [string, Tone][]; edgeTones?: [string, string, Tone][]; words?: Map<string, string> } = {},
) {
  const nodes: { id: string; label: string; x: number; y: number }[] = [];
  const edges: { from: string; to: string }[] = [];
  const badges: [string, string][] = [];
  const walk = (n: TNode, label: string) => {
    const p = pos.get(n.id)!;
    nodes.push({ id: n.id, label, x: p.x, y: p.y });
    if (n.isEnd) badges.push([n.id, o.words?.get(n.id) ?? n.id.slice(1)]);
    for (const [ch, child] of n.children) {
      edges.push({ from: n.id, to: child.id });
      walk(child, ch);
    }
  };
  walk(root, "root");
  const ends: [string, Tone][] = badges.map(([id]) => [id, "done"]);
  return graph("trie", { nodes, edges }, { tones: [...ends, ...(o.tones ?? [])], edgeTones: o.edgeTones, badges });
}

const pathIds = (word: string, upTo: number) => Array.from({ length: upTo + 1 }, (_, i) => `^${word.slice(0, i)}`);
const pathEdges = (ids: string[], tone: Tone): [string, string, Tone][] => ids.slice(1).map((id, i) => [ids[i], id, tone]);

// ------------------------------------------------------------------ traces
export const trieInsert = defineTrace({
  id: "trie-insert",
  title: "Insert: shared prefixes share nodes",
  description: "Words are inserted one character at a time; existing edges are followed, missing ones are created, and the last node is marked as the end of a word.",
  code: `
insert(word) {
  let node = this.root;                       //@start
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, new TrieNode());  //@create
    }
    node = node.children.get(ch);             //@follow
  }
  node.isEnd = true;                          //@end
}`,
  presets: [
    { label: "car, cat, cart, dog, do", input: { words: ["car", "cat", "cart", "dog", "do"] } },
    { label: "Prefix inserted last", input: { words: ["tent", "tend", "ten"] } },
  ],
  run(t, { words }) {
    const pos = layout(words);
    const root = makeNode("");
    let created = 1;
    t.step("start", "An empty trie is just a root node. Each edge below it will stand for one character, and a badge will mark a node where a whole word ends.", {
      views: [drawTrie(root, pos), note(`Words to insert: ${words.join(", ")}`)],
      vars: { nodes: created },
    });
    for (const word of words) {
      let node = root;
      t.step("start", `Insert "${word}": start at the root and read it one character at a time.`, {
        views: [drawTrie(root, pos, { tones: [[root.id, "active"]] }), arr("word", [...word], { pointers: { ch: 0 } })],
        vars: { word, nodes: created },
      });
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        const ids = pathIds(word, i + 1);
        const isNew = !node.children.has(ch);
        if (isNew) {
          node.children.set(ch, makeNode(word.slice(0, i + 1)));
          created++;
        }
        node = node.children.get(ch)!;
        t.step(
          isNew ? "create" : "follow",
          isNew
            ? `No edge for '${ch}' yet, so create a node for "${word.slice(0, i + 1)}" and step into it.`
            : `"${word.slice(0, i + 1)}" is already in the trie (an earlier word shares this prefix), so just follow the edge: no new node.`,
          {
            views: [drawTrie(root, pos, { tones: [[node.id, isNew ? "new" : "active"]], edgeTones: pathEdges(ids, "active") }), arr("word", [...word], { pointers: { ch: i }, tones: { [i]: isNew ? "new" : "active" } })],
            vars: { word, ch, nodes: created },
          },
        );
      }
      const was = node.isEnd;
      node.isEnd = true;
      t.step("end", was ? `"${word}" was already marked, so nothing changes.` : `Mark the last node: a word ends at "${word}". Without this flag, "${word}" would only be a prefix of other words.`, {
        views: [drawTrie(root, pos, { tones: [[node.id, "found"]], edgeTones: pathEdges(pathIds(word, word.length), "found") }), arr("word", [...word], { tones: Object.fromEntries([...word].map((_, i) => [i, "found"])) })],
        vars: { word, nodes: created },
      });
    }
    const letters = words.reduce((s, w) => s + w.length, 0);
    t.step("end", `${words.length} words with ${letters} characters in total needed only ${created - 1} nodes below the root: shared prefixes are stored once. Each insert cost O(length of the word).`, {
      views: [drawTrie(root, pos), note(`${created} nodes for ${letters} characters`, "found")],
      vars: { nodes: created },
    });
  },
});

export const trieLookup = defineTrace({
  id: "trie-search-prefix",
  title: "search vs startsWith: the same walk, a different last check",
  description: "Both operations follow the query one character at a time from the root; search also needs the final node to be marked as the end of a word, startsWith does not.",
  code: `
find(prefix) {
  let node = this.root;                    //@start
  for (const ch of prefix) {
    node = node.children.get(ch);          //@step
    if (!node) return null;                //@missing
  }
  return node;                             //@reached
}
search(word) { const n = this.find(word); return n !== null && n.isEnd; } //@search
startsWith(prefix) { return this.find(prefix) !== null; }                 //@prefix`,
  presets: [
    {
      label: "car, cat, cart, dog",
      input: { words: ["car", "cat", "cart", "dog"], queries: [["search", "cart"], ["search", "ca"], ["startsWith", "ca"], ["search", "cow"]] as [string, string][] },
    },
    {
      label: "app, apple, apply",
      input: { words: ["app", "apple", "apply"], queries: [["search", "appl"], ["startsWith", "appl"], ["search", "app"]] as [string, string][] },
    },
  ],
  run(t, { words, queries }) {
    const pos = layout(words);
    const root = makeNode("");
    for (const w of words) {
      let n = root;
      for (let i = 0; i < w.length; i++) {
        if (!n.children.has(w[i])) n.children.set(w[i], makeNode(w.slice(0, i + 1)));
        n = n.children.get(w[i])!;
      }
      n.isEnd = true;
    }
    t.step("start", `The trie holds ${words.join(", ")}. Badged nodes end a word. Every query walks down from the root, one character per step.`, { views: [drawTrie(root, pos)], vars: {} });
    const answers: string[] = [];
    for (const [op, q] of queries) {
      let node: TNode | undefined = root;
      t.step("start", `${op}("${q}"): start at the root.`, { views: [drawTrie(root, pos, { tones: [[root.id, "active"]] }), arr("query", [...q], { pointers: { ch: 0 } })], vars: { op, query: q } });
      let i = 0;
      for (; i < q.length; i++) {
        const next: TNode | undefined = node.children.get(q[i]);
        if (!next) {
          t.step("missing", `${node === root ? "The root" : `"${q.slice(0, i)}"`} has no '${q[i]}' child. No stored word starts with "${q.slice(0, i + 1)}", so the walk stops after ${i + 1} step${i === 0 ? "" : "s"}, however many words the trie holds.`, {
            views: [drawTrie(root, pos, { tones: [[node.id, "bad"]], edgeTones: pathEdges(pathIds(q, i), "active") }), arr("query", [...q], { pointers: { ch: i }, tones: { [i]: "bad" } })],
            vars: { op, query: q, ch: q[i] },
          });
          node = undefined;
          break;
        }
        node = next;
        t.step("step", `Follow '${q[i]}' to "${q.slice(0, i + 1)}".`, {
          views: [drawTrie(root, pos, { tones: [[node.id, "active"]], edgeTones: pathEdges(pathIds(q, i + 1), "active") }), arr("query", [...q], { pointers: { ch: i }, tones: { [i]: "active" } })],
          vars: { op, query: q, ch: q[i] },
        });
      }
      let result: boolean;
      let caption: string;
      if (!node) {
        result = false;
        caption = `find returned null, so ${op}("${q}") is false.`;
      } else if (op === "search") {
        result = node.isEnd;
        caption = node.isEnd
          ? `The whole query was read and "${q}" is marked as the end of a word: search is true.`
          : `The path "${q}" exists, but no word ends there (it is only a prefix of ${words.filter((w) => w.startsWith(q)).join(", ")}): search is false.`;
      } else {
        result = true;
        caption = `The whole prefix was read without falling off the trie, so at least one word starts with "${q}": startsWith is true. It doesn't care whether a word ends here.`;
      }
      answers.push(`${op}("${q}") = ${result}`);
      const ids = node ? pathIds(q, q.length) : [];
      t.step(op === "search" ? "search" : "prefix", caption, {
        views: [
          drawTrie(root, pos, { tones: node ? [[node.id, result ? "found" : "bad"]] : [], edgeTones: pathEdges(ids, result ? "found" : "active") }),
          note(`${op}("${q}") → ${result}`, result ? "found" : "bad"),
        ],
        vars: { op, query: q, result },
      });
    }
    t.step("reached", `Each query cost at most one step per character of the query: O(L), independent of how many words are stored. ${answers.join("; ")}.`, {
      views: [drawTrie(root, pos), note(answers.join(" · "))],
      vars: {},
    });
  },
});

export const wildcardSearch = defineTrace({
  id: "trie-wildcard",
  title: "Wildcard search: a dot tries every child",
  description: "A depth-first search walks the trie along the pattern; a letter follows one edge, a dot branches into every child, and failed branches are abandoned before trying the next one.",
  code: `
search(pattern) {
  const dfs = (node, i) => {
    if (i === pattern.length) return node.isEnd;     //@done
    const ch = pattern[i];
    if (ch !== ".") {
      const child = node.children.get(ch);           //@exact
      return child !== undefined && dfs(child, i + 1);
    }
    for (const child of node.children.values()) {    //@dot
      if (dfs(child, i + 1)) return true;
    }
    return false;                                    //@fail
  };
  return dfs(this.root, 0);                          //@start
}`,
  presets: [
    { label: "Match after backtracking", input: { words: ["bad", "bed", "cat", "cod"], pattern: "..t" } },
    { label: "No match", input: { words: ["bad", "bed", "cat", "cod"], pattern: "..x" } },
  ],
  run(t, { words, pattern }) {
    const pos = layout(words);
    const root = makeNode("");
    for (const w of words) {
      let n = root;
      for (let i = 0; i < w.length; i++) {
        if (!n.children.has(w[i])) n.children.set(w[i], makeNode(w.slice(0, i + 1)));
        n = n.children.get(w[i])!;
      }
      n.isEnd = true;
    }
    const dead = new Set<string>();
    const path: string[] = [root.id];
    const views = (current: TNode, i: number, tone: Tone = "active", extra: [string, Tone][] = []) => [
      drawTrie(root, pos, { tones: [...[...dead].map((id) => [id, "bad"] as [string, Tone]), ...path.slice(0, -1).map((id) => [id, "window"] as [string, Tone]), [current.id, tone], ...extra], edgeTones: pathEdges(path, "active") }),
      arr("pattern", [...pattern], { pointers: i < pattern.length ? { i } : { i: pattern.length }, tones: Object.fromEntries([...pattern].map((c, k) => [k, k < i ? "done" : c === "." ? "pivot" : "window"])) }),
    ];
    t.step("start", `Search "${pattern}" in a trie of ${words.join(", ")}. A dot can be any letter, so the search may have to try several branches; a letter allows only one.`, { views: views(root, 0), vars: { pattern, i: 0 } });

    const dfs = (node: TNode, i: number): boolean => {
      const prefix = node.id.slice(1);
      if (i === pattern.length) {
        t.step("done", node.isEnd ? `The whole pattern is used up at "${prefix}", and a word ends here. Match found.` : `The pattern is used up at "${prefix}", but no word ends here.`, {
          views: views(node, i, node.isEnd ? "found" : "bad"),
          vars: { pattern, i, node: prefix },
        });
        if (!node.isEnd) dead.add(node.id);
        return node.isEnd;
      }
      const ch = pattern[i];
      if (ch !== ".") {
        const child = node.children.get(ch);
        if (!child) {
          t.step("exact", `pattern[${i}] is '${ch}', but "${prefix || "root"}" has no '${ch}' child. This branch is dead: go back and try the next option.`, {
            views: views(node, i, "bad"),
            vars: { pattern, i, ch, node: prefix || "root" },
          });
          dead.add(node.id);
          return false;
        }
        t.step("exact", `pattern[${i}] is the letter '${ch}': there is only one edge to follow, to "${child.id.slice(1)}".`, { views: views(node, i), vars: { pattern, i, ch, node: prefix || "root" } });
        path.push(child.id);
        const ok = dfs(child, i + 1);
        if (!ok) {
          path.pop();
          dead.add(node.id);
        }
        return ok;
      }
      const kids = [...node.children.values()];
      t.step("dot", `pattern[${i}] is a dot: try every child of ${prefix ? `"${prefix}"` : "the root"} in turn (${kids.map((k) => `'${k.id.slice(-1)}'`).join(", ")}) and stop at the first that leads to a match.`, {
        views: views(node, i),
        vars: { pattern, i, ch, node: prefix || "root" },
      });
      for (const child of kids) {
        path.push(child.id);
        if (dfs(child, i + 1)) return true;
        path.pop();
      }
      t.step("fail", `Every child of ${prefix ? `"${prefix}"` : "the root"} failed, so this call returns false.`, { views: views(node, i, "bad"), vars: { pattern, i, node: prefix || "root" } });
      dead.add(node.id);
      return false;
    };
    const found = dfs(root, 0);
    t.step("start", found ? `search("${pattern}") is true. The dead branches cost a few steps each; branches that don't match the letters are never entered.` : `search("${pattern}") is false: every branch the dots allowed was tried and died.`, {
      views: [...views(root, pattern.length, found ? "found" : "bad"), note(`search("${pattern}") → ${found}`, found ? "found" : "bad")],
      vars: { pattern, result: found },
    });
  },
});
