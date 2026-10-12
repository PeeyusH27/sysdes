# 07 · The DSA track

The site started as a system design suite. This plan adds a second track, **Data Structures and Algorithms**, built on the same principles: typed content next to the code that renders it, animations you can step through, and code that is proven to run.

## 1. Goals

- Teach the **patterns** behind most coding-interview problems instead of hundreds of unrelated problems.
- Explain every pattern **step by step**, with an animation synced to highlighted JavaScript, a reusable template, complexity, common mistakes and a quiz.
- Let learners **solve problems in the browser**: an editor, example and hidden tests, console output, and automatic "solved" tracking.
- Keep the answer hidden until it helps: the **step-by-step solution unlocks after the first wrong submission**.
- Start with a **JavaScript cheat sheet** covering every language feature the patterns rely on, and tag lessons and problems with the sections they use.

## 2. Sitemap

```
/                          Two tracks: DSA and System Design (live visual, stats, progress, entry links)
/system-design             The former home page: HLD path, deep dives, questions, playground entry points
/dsa                       DSA landing: roadmap (JS → patterns → practice), next unsolved problem, pattern path with progress
/dsa/js                    JavaScript for DSA cheat sheet: 20 topics on one page, anchors (#map-set), runnable snippets
/dsa/patterns              The 22 patterns grouped (arrays & strings, search & optimisation, lists, trees, graphs, bits)
/dsa/patterns/[slug]       Pattern lesson + its tagged practice problems
/dsa/problems              All problems: filter by pattern, difficulty, status, search (state in the URL)
/dsa/problems/[slug]       Workspace: statement | hints | solution (locked) — editor — test results and console
```

The navigation is track-aware: the top bar always shows **DSA** and **System Design**, and expands the current track's links (JS cheat sheet, Patterns, Problems / Learn, Deep dives, Questions, Playground, Cheatsheet). All existing system design URLs are unchanged.

## 3. Content model

| What | Where | Validated by |
|---|---|---|
| Patterns and cheat sheet topics (titles, order, signals, JS refs) | `content/dsa/registry.ts` | `tests/dsa.test.ts` |
| Pattern lesson | `content/dsa/patterns/<NN-slug>/page.mdx` | `scripts/check-content.mjs` |
| Animations | `content/dsa/patterns/<dir>/viz.ts` (`defineTrace`) | every frame checked in `tests/dsa.test.ts` |
| Templates and demos | `content/dsa/patterns/<dir>/snippets/*.js` + `*.test.js` | Vitest; `<RunCode>` demos are executed |
| Quiz | `content/dsa/patterns/<dir>/quiz.ts` | `tests/dsa.test.ts` |
| Cheat sheet topic | `content/dsa/js/<NN-id>.mdx` + `content/dsa/js/snippets/` | checker; every snippet is run |
| Problem | `content/dsa/problems/<slug>/{problem.json, statement.md, solution.md, solution.js, starter.js?}` | zod schema; the reference solution must pass every test through the browser runner; the starter must compile and fail |

Problems are discovered from disk (`src/lib/dsa/load.ts`), so adding one is adding a folder. A problem lists its patterns (the first is primary) and the cheat sheet topics it uses; pattern pages list their tagged problems automatically, and problem pages link back to both.

Authoring rules live in [`docs/AUTHORING-DSA.md`](../AUTHORING-DSA.md).

## 4. The animation engine (`src/components/algo/`)

Same philosophy as the system design `FlowDiagram` scenarios: the story is data, the player is generic.

- **Traces run at build time.** `defineTrace({ code, presets, run })` executes an instrumented copy of the algorithm on each preset input. Each `t.step(label, caption, { views, vars })` records a frame. Code lines are tagged with `//@label` markers, so frames point at lines by name and a wrong label fails the build.
- **Views** describe what is on screen in each frame: `arr` (cells, named pointers, a window band, tones), `grid` (DP tables, matrices), `hashmap`, `hashset`, `stack`, `queue`, `linked` (arrows follow each node's real `.next`, so reversal visibly flips arrows), `tree` and `heapTree`, `graph` (weights, edge tones, badges such as distances or in-degrees) and `note`.
- **Tones** (active, compare, found, bad, done, window, muted, pivot, new) are the only colours; found/bad also draw ✓/✕ so colour is never the only signal.
- **The player** (`AlgoPlayer`) shows the views, the code with the current line highlighted (Shiki on the server, one `data-line` per line), a variable watch panel that highlights changed values, play/pause/step/scrub/speed controls, keyboard shortcuts (Space, ←, →, Home), preset tabs, and an "All steps as text" alternative. Elements keep identity between frames, so pointers glide, chips appear and tree nodes move. Reduced motion turns animation off.
- **Compact mode** loops a trace without code or controls (home page and DSA landing).

## 5. Running learner code

- **`public/dsa-runner.js`** is a dependency-free script used two ways: as a **Web Worker** in the browser, and evaluated directly in **Vitest**, so reference solutions are checked by exactly the code learners run against.
- The worker compiles the code with `new Function` (strict mode, `ListNode`/`TreeNode` provided), converts JSON test inputs (`io`: list, tree, list with a cycle, list of lists, node value), runs each test with a deep-cloned input, captures `console.*`, converts results back, and compares (`exact`, `unordered`, `deep-unordered`, `float`, or a problem-specific `validate` function for multiple valid answers). Design problems run sequences of method calls.
- Results stream back test by test. The page terminates the worker if a test runs past its limit (3 s by default), which is how infinite loops are reported as **Time limit exceeded** instead of freezing the tab.
- Runtime errors map back to the learner's line number, which is also highlighted in the editor.
- `runScript` runs cheat sheet and lesson snippets (`<RunCode>`), waits for timers to settle, and returns the console output.

## 6. The workspace (`/dsa/problems/[slug]`)

- Left: breadcrumb, title, difficulty, patterns, a manual "Mark solved" toggle, and tabs: **Description** (statement and examples generated from the sample tests, plus "JavaScript you'll use" chips), **Hints** (revealed one at a time), **Solution**.
- Right: CodeMirror 6 editor (lazy-loaded, theme from CSS variables, bracket matching, Mod-Enter to submit, Mod-' to run examples), **Run examples** (sample tests) and **Submit** (all tests), then results with per-test input / expected / output / error / console, and a Console tab.
- **Unlock rule:** the Solution tab shows a lock until the learner has at least one failed submission for that problem. The first failure shows a banner linking to it. The solution is the step-by-step `solution.md` (intuition, numbered steps, dry-run table, edge cases, common mistakes) followed by the highlighted reference code and a complexity table.
- **Progress** (`src/lib/dsa/store.ts`, localStorage): solved timestamps, submission and failure counts. Drafts are stored separately and autosaved, so a reload keeps the learner's code. Pattern lessons reuse the site's existing completion tracking (quiz or "Mark complete").

## 7. The pattern path

| # | Pattern | Group |
|---|---|---|
| 1 | Hash Maps and Sets | Arrays & strings |
| 2 | Two Pointers | Arrays & strings |
| 3 | Sliding Window | Arrays & strings |
| 4 | Prefix Sums and Difference Arrays | Arrays & strings |
| 5 | Binary Search | Search & optimisation |
| 6 | Stacks and Monotonic Stacks | Arrays & strings |
| 7 | Intervals and Sweep Line | Arrays & strings |
| 8 | Fast and Slow Pointers | Linked lists |
| 9 | In-place Linked List Manipulation | Linked lists |
| 10 | Tree Depth-First Search | Trees |
| 11 | Tree Breadth-First Search | Trees |
| 12 | Tries | Trees |
| 13 | Heaps: Top-K, K-way Merge, Two Heaps | Trees |
| 14 | Graph BFS and DFS | Graphs |
| 15 | Topological Sort | Graphs |
| 16 | Union-Find | Graphs |
| 17 | Shortest Paths: BFS, Dijkstra, Bellman-Ford | Graphs |
| 18 | Backtracking | Search & optimisation |
| 19 | Greedy | Search & optimisation |
| 20 | Dynamic Programming I: 1D | Search & optimisation |
| 21 | Dynamic Programming II: Grids, Strings, Knapsack | Search & optimisation |
| 22 | Bit Manipulation | Bits |

Each pattern has 5–7 primary problems (Easy → Hard) and can be a secondary tag on others.

Cheat sheet topics: variables and equality, numbers and Math, strings, arrays, array methods, sorting, objects, Map and Set, destructuring and spread, functions and closures, recursion, classes, iterators and generators, stacks/queues/deques, list and tree nodes, heaps, graphs and grids, bitwise operators, Big-O of built-ins, and gotchas.

## 8. Testing

| Check | Command |
|---|---|
| Registry, problem schemas, reference solutions vs every test, starters compile and fail, every animation frame, quizzes, every runnable snippet | `npx vitest run tests/dsa.test.ts` |
| Template snippets | `npx vitest run content/dsa` |
| MDX compiles; components, files, `JsRef` ids, `ProblemLink` slugs and DSA links exist | `node scripts/check-content.mjs dsa` |
| Home tracks, unlock-after-wrong-submission, solved tracking, error lines, time limits, drafts, player keys, runnable snippets, URL filters | `npx playwright test tests/e2e/dsa.spec.ts` |
| Accessibility (axe) on every page, DSA included | `npx playwright test tests/e2e/site.spec.ts` |

## 9. Later

- Custom input in the animation player (run a tracer on the learner's own array).
- Spaced repetition: resurface solved problems after a few days.
- Per-problem notes and a "solved without the solution" badge.
- Mock interview mode: a timer, two random problems from different patterns, no hints.
- Syncing progress across devices (needs accounts and a backend).
