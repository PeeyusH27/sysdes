# Authoring guide: the DSA track

The DSA track has three parts: a **JavaScript cheat sheet** (`/dsa/js`), **pattern lessons** (`/dsa/patterns/<slug>`) and **practice problems** (`/dsa/problems/<slug>`) solved in an in-browser editor. Everything is registered in `content/dsa/registry.ts` (already complete: don't edit it).

**Read the finished examples first and match their depth and tone:**

- Pattern: `content/dsa/patterns/02-two-pointers/` (`page.mdx`, `viz.ts`, `quiz.ts`, `snippets/`)
- Problems: `content/dsa/problems/{valid-palindrome,two-sum-sorted,move-zeroes,three-sum,container-with-most-water,trapping-rain-water}/`
- Cheat sheet topic: `content/dsa/js/08-map-set.mdx` + `content/dsa/js/snippets/`

The general MDX rules in `docs/AUTHORING.md` apply too (no `{`/`}` or `<letter` in prose, double-quoted attributes, plain-data props, blank line after an opening component tag when it contains markdown).

**Write everything in your own words.** Classic problems (Two Sum, Number of Islands…) are fair game as ideas, but never copy problem statements, examples or editorial text from LeetCode or any other site.

---

## 1. Pattern lesson: `content/dsa/patterns/<dir>/`

```
page.mdx      the lesson body (title, summary, signals and JS refs come from the registry: don't repeat them)
viz.ts        2–3 animation traces (defineTrace) — at least 2
quiz.ts       export const quiz: QuizItem[] — exactly 3 items, each with `explain`
snippets/     templates as ES modules (export function …) + a sibling *.test.js for each,
              and one try-it.js demo for <RunCode>
```

### page.mdx outline (follow the two-pointers page)

1. `import { … } from './viz'` and `import { quiz } from './quiz'`, then `<TLDR>` (2–3 sentences: what it is, the key insight, the complexity win).
2. `## When to reach for it`: a `<Callout kind="tip" title="Spot it in the problem statement">` list of signals, then a table of the pattern's **variants** (name, setup, when to move/branch, classic problems).
3. `## The core idea…`: why the pattern is correct (the invariant / the argument that makes it safe), then the first `<AlgoViz trace={…} />`.
4. `## Step by step`: `<Steps>` with 4–6 `<Step title="…">` describing how to apply the pattern to a new problem.
5. `## Template …` sections (one per variant): short explanation, `<AlgoViz>` for the variant where useful, and `<CodeTabs files={['snippets/x.js']} />`. Mention which problems each template solves.
6. `## Try it`: `<RunCode src="snippets/try-it.js" />`.
7. `## Complexity`: a table per variant (time, extra space) with a one-line justification.
8. `## JavaScript you'll use`: `<JsRef to={["map-set", "sorting"]} />` (ids from the registry) plus a short ```js block of the idioms, then a sentence on the main JS trap.
9. `<Callout kind="warning">` with the 4–6 most common bugs.
10. `## Interview questions`: `<FollowUps>` with 3–5 `<FollowUp q="…">` answered properly (trade-offs, variations, follow-ups interviewers actually ask).
11. `<Quiz items={quiz} />`.

The page automatically gets a **Practice problems** section listing every problem tagged with the pattern; you don't write it. You can link to a problem inline with `<ProblemLink slug="two-sum" />` and to another pattern with `[Sliding Window](/dsa/patterns/sliding-window)`.

### Components for DSA MDX

| Component | Use |
|---|---|
| `<AlgoViz trace={x} />` | animated, step-through walkthrough of a trace from `./viz` (optional `preset="Label"`) |
| `<RunCode src="snippets/try-it.js" />` | highlighted snippet with **Run** (executes in a worker and shows console output) and **Edit** |
| `<JsRef to="map-set" />` | inline chip linking to a cheat sheet topic; `to={["a", "b"]}` renders a labelled row |
| `<ProblemLink slug="…" />` | link to a practice problem with difficulty and solved tick |
| `<CodeTabs>`, `<CodeBlock>`, `<Steps>`, `<Callout>`, `<FollowUps>`, `<Quiz>`, `<TLDR>`, tables | as in `docs/AUTHORING.md` |

### Snippets

- Templates are ES modules: `export function name(…) {…}` with a short comment saying when to use it. Each has `name.test.js` (`import { test, expect } from 'vitest'`) covering normal and edge cases.
- `try-it.js` is the runnable demo. Import the templates with a hidden import, which is inlined at run time:
  ```js
  import { pairSum } from './opposite-ends.js'; // @hide
  console.log(pairSum([1, 3, 4, 6, 8, 11], 10)); // [2, 3]
  ```
  It must print something with `console.log` and must not throw. Put the expected output in a trailing comment. Local imports inside the templates (e.g. `dijkstra.js` importing `min-heap.js`) are inlined too, each file once, so templates should declare functions and classes rather than top-level `const`s that could clash.
- For linked lists and trees, define small helpers in the snippet (`class ListNode`, a `fromArray` builder) so it runs standalone with `node`. `ListNode` and `TreeNode` are also provided in `<RunCode>` and the editor, and a snippet may declare its own classes with those names.

### viz.ts: animation traces

A trace runs an instrumented copy of the algorithm on preset inputs **at build time** and records frames. Frames are pure data; the player animates between them and highlights the current code line.

```ts
import { arr, defineTrace, hashmap, note, span } from "@/components/algo/trace";
import type { Tone } from "@/components/algo/types";

export const twoSum = defineTrace({
  id: "two-sum-map",                       // unique per file
  title: "One pass with a hash map",       // shown above the player
  description: "…one sentence for screen readers…",
  code: `
function twoSum(nums, target) {
  const seen = new Map();                  //@init
  for (let i = 0; i < nums.length; i++) {  //@loop
    const need = target - nums[i];         //@need
    if (seen.has(need)) return [seen.get(need), i]; //@found
    seen.set(nums[i], i);                  //@store
  }
}`,
  presets: [{ label: "Pair exists", input: { nums: [2, 7, 11, 15], target: 9 } }],
  run(t, { nums, target }) {
    const seen = new Map<number, number>();
    t.step("init", "Start with an empty map from value to index.", { views: [arr("nums", nums), hashmap("seen", seen)], vars: { target } });
    // … call t.step(label, caption, { views, vars }) at every meaningful moment …
  },
});
```

Rules:

- Mark code lines with `//@label` (letters, digits, `-`). `t.step("label", …)` highlights that line. Markers are stripped from the displayed code. An unknown label throws.
- **Captions are full sentences that explain why**, not just what: "9 is too small, so 1 can't pair with anything: move left." 1–2 sentences.
- The first frame is the starting state; the last frame shows the result (a `note(…, "found")` view works well).
- 8–40 frames per preset (hard limit 80; short edge-case presets may have as few as 3). Choose small inputs (5–8 elements, 5–9 tree or graph nodes).
- Give every trace 1–3 presets: the typical case plus an edge case (no answer, duplicates, empty).
- Pass live arrays/maps to the builders: they are deep-copied per frame.
- `vars` is the watch panel (changed values are highlighted between frames). Keep it to the 2–5 variables that matter.
- At least **2 traces per pattern**, covering different variants. Don't animate the exact solution of a practice problem; animate the template on a canonical example.

View builders (`@/components/algo/trace`). Tones: `active` (being looked at), `compare` (compared against), `found` (part of the answer, shows ✓), `bad` (rejected, shows ✕), `done` (finished), `window` (inside the current range), `muted` (out of play), `pivot` (special: mid, root, pivot), `new` (just added).

| Builder | Draws |
|---|---|
| `arr(label, values, { pointers: { left: 0, right: 5 }, window: [i, j], tones: { 2: "active" }, indices })` | array cells; pointers may be `-1` or `values.length` (drawn as a dashed ghost); `span(i, j, tone)` makes a tone range |
| `grid(label, cells2d, { rowLabels, colLabels, tones: [[r, c, "active"]] })` | DP tables and matrices; use `"∞"`-style strings or `Infinity` (shown as ∞) |
| `hashmap(label, mapOrObjOrEntries, { tones: [[key, "new"]] })` | key → value chips |
| `hashset(label, iterable, { tones: [[item, "found"]] })` | chips |
| `stack(label, itemsBottomFirst, { tones: { [index]: "active" } })` | vertical stack, top labelled |
| `queue(label, itemsFrontFirst, { tones })` | horizontal queue, front/back labelled |
| `linked(label, nodesInDrawOrder, { pointers: { prev, curr }, tones: [[node, "active"]] })` | linked list from `buildList(values)` nodes; arrows follow each node's current `.next`, so reversal shows arrows flipping; a `null` pointer is drawn on a "null" ghost at the left |
| `tree(label, root, { ids, pointers, tones: [[node, tone]], badges: [[node, value]] })` | binary tree from `buildTree(levelOrder)`; create `const ids = new NodeIds()` once per run and pass it every time so nodes keep identity when the tree changes shape |
| `heapTree(label, heapArray, { tones: { [i]: tone }, badges })` | an array heap drawn as a complete tree (pair it with `arr` of the same heap) |
| `graph(label, { nodes: [{ id, x, y, label? }], edges: [{ from, to, w? }], directed }, { tones, edgeTones: [[a, b, tone]], badges })` | x, y in 0..100; `circleLayout(ids)` gives positions on a circle |
| `note(text, tone?)` | a one-line callout, e.g. the result |

Use several views in one frame when the algorithm has several structures (array + map, grid + queue, graph + heap + distance array).

### quiz.ts

```ts
import type { QuizItem } from "@/components/content/Quiz";
export const quiz: QuizItem[] = [{ q: "…", options: ["…", "…", "…"], answer: 1, explain: "…" }, /* 3 items */];
```

Test understanding (why it works, which variant, complexity), not trivia.

---

## 2. Practice problem: `content/dsa/problems/<slug>/`

The slug is kebab-case and unique across the whole track (check `ls content/dsa/problems`). Every problem folder has four files:

### problem.json

```json
{
  "title": "Two Sum",
  "difficulty": "Easy",
  "patterns": ["hashing"],
  "js": ["map-set"],
  "order": 1,
  "summary": "One sentence shown in lists and search.",
  "fn": "twoSum",
  "params": ["nums", "target"],
  "types": { "params": ["number[]", "number"], "returns": "number[]" },
  "compare": "unordered",
  "tests": [
    { "args": [[2, 7, 11, 15], 9], "expected": [0, 1], "explain": "nums[0] + nums[1] = 9." },
    { "args": [[3, 2, 4], 6], "expected": [1, 2] }
  ],
  "samples": 3,
  "hints": ["…", "…", "…"],
  "complexity": { "time": "O(n): …", "space": "O(n): …" }
}
```

| Field | Notes |
|---|---|
| `patterns` | pattern slugs; the **first is the primary** pattern (where it's listed). Add secondary patterns only when they're a genuine alternative approach. |
| `js` | 1–3 cheat sheet topic ids the solution relies on |
| `order` | position within the primary pattern: easier first |
| `fn`, `params`, `types` | the function learners write; a starter with JSDoc is generated from these |
| `tests` | **8–12 tests**. The first `samples` (default 3) are shown as examples and run by "Run examples"; give them an `explain`. The rest are hidden-ish edge cases: empty/minimal input, single element, duplicates, negatives, all equal, already sorted/reverse sorted, no answer, a bigger input (20–60 elements). |
| `compare` | `exact` (default), `unordered` (top-level order doesn't matter), `deep-unordered` (order doesn't matter at any level: subsets, groups, triplets), `float` (1e-5 tolerance) |
| `validate` | for problems with **many valid answers** (any topological order, any valid path…): JS source of `(result, args, expected) => true \| "why it is wrong"`. `args` are the raw JSON args. Then `expected` is just one valid answer, shown for reference. |
| `io` | conversions: `{ "args": ["list", null], "returns": "list" }`. Types: `list` (array → ListNode head), `tree` (level-order array with nulls → TreeNode root), `list-cycle` (arg is `[values, pos]`: tail links to index `pos`, -1 for none), `list[]` (array of arrays → array of heads), `node-val` (returns: compare `node.val`, or null). Returned ListNode/TreeNode are converted back to arrays automatically. |
| `inPlace` | index of the argument to compare after the call, for "modify in place, return nothing" problems |
| `kind: "design"` | class problems (MinStack, LRU, Trie…): `"className": "MinStack"`, no `fn`/`params`/`types`, tests are `{ "ops": ["MinStack", "push", "getMin"], "args": [[], [5], []], "expected": [null, null, 5] }`. Add a `starter.js` with the class skeleton and method stubs. |
| `timeoutMs` | per-test limit, default 3000 |

`ListNode` and `TreeNode` classes are provided globally to learner code (and to your `solution.js`).

**Expected values must be right.** Compute them with an independent brute-force implementation in a scratch script, not by trusting your reference solution. `npx vitest run tests/dsa.test.ts -t "<slug>"` runs your `solution.js` through the exact runner learners use.

### statement.md

Your own words. The problem in 2–5 short paragraphs (what is given, what to return, any rules like "in place" or "any order"), then `### Constraints` as a bullet list (use `10^5`-style exponents in code spans or plain text). No `#` heading and no examples: examples are rendered from the sample tests. Plain Markdown (not MDX), so `<` and `{` are fine.

### solution.md (revealed after a wrong submission)

This is the heart of the feature: a learner who just failed reads it to understand the approach. Use these `###` sections:

1. `### Intuition`: the key insight in plain language, starting from the brute force when that helps.
2. `### Step by step`: a **numbered list** (`1.`, `2.`, …) of the algorithm; nested lists for sub-steps.
3. `### Dry run: <small input>`: a Markdown table tracing the variables on one example.
4. `### Why it works` or `### Edge cases` (one or both).
5. `### Common mistakes`: 2–4 bullets.
6. Optionally `### Other ways to solve it` (alternative approach and its complexity).

The page adds the code (from `solution.js`) and the complexity table after it: don't repeat them.

### solution.js

A plain function declaration (or class for design problems) with the exact name from `fn` / `className`, no `export`, no imports. Clean, idiomatic, commented only where the reasoning isn't obvious. It should be the solution you'd want a learner to write.

### starter.js (optional)

Only for design problems or when the signature needs explaining. Otherwise the generated starter is used.

---

## 3. Cheat sheet topic: `content/dsa/js/<file>.mdx`

The page renders the topic title, its summary and the "Used in" pattern links; the MDX is the body. Follow `08-map-set.mdx`:

- Open with 1–2 sentences on why this matters for DSA.
- `###` sections (never `##`), each with a short explanation, a compact ```js reference block and/or a `<RunCode src="snippets/<topic>-<thing>.js" />`.
- **Heading text must be unique across the whole cheat sheet** (all topics render on one page): write "Map basics", "Sorting gotchas", not "Basics", "Gotchas".
- Include a **costs** table (Big-O of the operations covered) where it applies.
- End with a `<Callout kind="warning" title="<Topic> gotchas">` list of traps that fail hidden tests.
- Snippets in `content/dsa/js/snippets/` are plain scripts (no exports, no imports) that print with `console.log` and put the expected output in trailing comments. **Verify every comment against real output** (`node content/dsa/js/snippets/x.js`). Snippet file names are prefixed with the topic (`sorting-comparators.js`), since all topics share one folder.
- Each topic: 3–6 `###` sections and 2–5 runnable snippets. Depth over breadth: show the idioms used in real solutions.

---

## 4. Check your work (run often)

```bash
node scripts/check-content.mjs dsa/patterns/05            # MDX compiles; components, files, JsRef ids, links exist
node scripts/check-content.mjs dsa/js                     # cheat sheet topics
npx vitest run tests/dsa.test.ts -t "<pattern-slug>"      # your patterns' folders, problems, traces
npx vitest run tests/dsa.test.ts -t "<problem-slug>"      # one problem: schema, reference solution, starter
npx vitest run content/dsa/patterns/05-binary-search      # your snippet tests
npx vitest run tests/dsa.test.ts -t "runnable"            # every <RunCode> snippet runs and prints
npx tsc --noEmit                                          # types (ignore errors in other people's files)
```

Failures in other people's folders are expected while everyone works in parallel; make sure none are in yours.

**Do not** run `next build` or `next dev`, and do not edit anything outside your assigned folders: `content/dsa/registry.ts`, `src/`, `tests/`, `scripts/` and other patterns belong to someone else. If something in the shared code blocks you, say so in your final report instead of changing it.
