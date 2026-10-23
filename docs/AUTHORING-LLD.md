# Authoring the low-level design (LLD) track

Read `docs/AUTHORING.md` first: it covers MDX rules, the section-card layout, components and writing style, and all of it applies here. This file covers what is specific to LLD.

The track has three parts, all registered or discovered from `content/lld/`:

| Part | Where | Registered in |
|---|---|---|
| Foundation lessons (6) | `content/lld/foundations/<dir>/` | `content/lld/registry.ts` (`lldLessons`: do not edit) |
| Classic LLD questions | `content/questions/<slug>/` (tag `lld`) | `content/registry.ts` |
| Coding exercises | `content/lld/exercises/<slug>/` | discovered from disk |

## Who the reader is

Someone preparing for an interview round that says "design a parking lot" or "design a rate limiter, with classes". They may be strong at DSA and have never been told why a class should own one responsibility. Teach the **decision**, not the vocabulary: every pattern or principle is introduced by code that hurts, then the change that fixes it, then when **not** to bother. Most LLD content online lists patterns; this track earns its place by showing the pain first and being honest about over-engineering (interviewers penalise a `ParkingSpotManagerFactory` as much as a god class).

## Foundation lessons

```
content/lld/foundations/<dir>/
  page.mdx        # body only: title, summary and minutes come from content/lld/registry.ts
  quiz.ts         # export const quiz: QuizItem[]   (3 items, each with `explain`)
  diagrams.ts     # optional: ClassSpec / SequenceSpec / DecisionSpec objects
  snippets/
    <name>.js            # shown on the page, pure and runnable (no I/O)
    <name>.test.js       # vitest tests (`import { test, expect } from 'vitest'`)
    try-it.js            # optional: a <RunCode> cell (see below)
    python/<name>.py     # the same code in Python (snake_case file and function names)
    python/test_<name>.py  # unittest tests (see content/dsa/patterns/01-hashing/snippets/python/)
    python/try_it.py     # the Python twin of try-it.js, when try-it.js exists
```

Rules, enforced by `tests/lld-lessons.test.ts`, `tests/content.test.ts` and `node scripts/check-content.mjs`:

- **JavaScript and Python only.** Every `snippets/*.js` (not `*.test.js`) needs `snippets/python/<snake_name>.py`, the page must reference both paths (in `<CodeTabs files={[...]} python={[...]}>` or `<RunCode src python>`), and the Python unittest run must contain at least as many tests as the JavaScript one. There is no Java yet, because it cannot be compiled in the authoring environment: do not add Java files.
- Snippets are **short**: a whole snippet is 10 to 40 lines, so a reader sees the idea. A lesson has 5 to 9 snippets. Comments say why, not what.
- Show **before and after**: a snippet named `shipping-before.js` (the hurting version) next to `shipping-after.js`. Tests only need to cover the "after" and prove the "before" fails the new requirement where that is the point.
- Use real, familiar domains (parking, pricing, notifications, orders, elevators), not `Foo` and `Bar`.
- Start `page.mdx` with `import { quiz } from './quiz'` (plus `./diagrams` if used), then `<TLDR>` (at most two sentences), then `##` sections. End with `<FollowUps>` (3 to 5 interview-style questions with 1 to 3 sentence answers), then `<Quiz items={quiz} />`. Do not add a "Code it yourself" section: the page template appends it automatically when an exercise points at the lesson.
- Each `##` section is one idea, under about 4 minutes. Roughly: a hook, the pain (code), the fix (code or diagram), the rule of thumb. Include one `<Callout kind="interview">` per lesson saying what interviewers listen for, and one `<Callout kind="warning">` for the over-engineering trap.
- Use `ClassDiagram` with **`stages`** whenever a design grows: each stage adds classes (by id) to the diagram, and its `note` says what changed and why. Stage 1 is the naive version. See `content/lld/foundations/` once lesson 1 exists, or the `ClassSpec` type in `src/components/diagram/types.ts`. Every class must be added in exactly one stage, and a diagram has 3 to 5 stages. Keep ids and layout positions stable (rows 0 to 2, columns 0 to 3).
- A `<RunCode src="snippets/try-it.js" python="snippets/python/try_it.py" />` cell lets the reader run and edit code. Put `// @hide` after `import` lines in `try-it.js` that should not show, as in `content/dsa/patterns/01-hashing/snippets/try-it.js`. Use at most one or two per lesson, for a moment where changing a number or a class teaches something.
- Link to other pages with plain Markdown links: `/lld/foundations/<slug>`, `/questions/parking-lot`, `/questions/elevator`, `/questions/vending-machine`, `/lld/exercises/<slug>`. Never link to a page that does not exist; the lesson and exercise slugs are in `content/lld/registry.ts` and the table below.

### Check

```bash
node scripts/check-content.mjs lld/foundations/03          # MDX compiles, components exist, files resolve
npx vitest run content/lld/foundations/03-strategy-decorator   # JS snippet tests
npx vitest run tests/lld-lessons.test.ts -t strategy-decorator  # Python twins + unittest
npx vitest run tests/content.test.ts                        # diagrams and quiz integrity
npx tsc --noEmit
```

Do not run `next build` or `next dev`.

## Coding exercises

An exercise is a **design problem** in the same format as the DSA "design" problems (`content/dsa/problems/min-stack/` is the closest example, and `content/lld/exercises/event-bus/` is the finished LLD example: copy its shape, tone and depth). It runs in the browser editor, in JavaScript or Python, against hidden tests.

```
content/lld/exercises/<slug>/
  problem.json    # metadata and tests (validated by zod: src/lib/dsa/schema.ts)
  statement.md    # the problem, in Markdown
  solution.md     # step-by-step approach, with a numbered list
  solution.js     # reference solution; must pass every test
  solution.py     # Python reference solution; must pass every test
  starter.js      # the class skeleton the learner starts from
```

How the tests drive a class (`kind: "design"`): `ops[0]` is the class name (the constructor) and `args[0]` its constructor arguments; every later op is a method name with its argument list in `args[i]`. `expected[i]` is what that call returns (`null` for `undefined`/`None`, including the constructor). An expected `null` means "this call's return value is not checked" (the runner treats it as a void call, like LeetCode), so a method whose correct answer can be `null` cannot be tested on it: return a sentinel such as `""`, `-1` or a count instead. Every value must be JSON, so arguments and results are numbers, strings, booleans, arrays and plain objects, never functions or class instances. Methods are called by name, so Python uses the snake_case of each method (`add_rule` for `addRule`; the harness maps it). Exceptions are not part of the contract: return a value such as `false`, `"INVALID"` or `-1` instead and say so in the statement.

`problem.json` fields: `title`, `difficulty` (Easy, Medium, Hard), `patterns` (lesson slugs from `content/lld/registry.ts`, the first is the main lesson), `js: []`, `order` (a unique integer: the numbers below), `summary` (one sentence), `kind: "design"`, `className`, `samples: 3` (the first 3 tests are the examples shown to the learner, so make them the easiest), `tests` (at least 8, each with `ops`, `args`, `expected`, and an `explain` on the first few and on any subtle one), `hints` (3: nudge, structure, almost the answer), `complexity`.

What makes a good exercise:

- It teaches the lesson's **design idea** through observable behaviour. The tests cannot see your class structure, so the statement must make the extensibility requirement concrete (for example: "adding a new kind of rule must not change existing code", then include a test that only a clean design makes easy, such as a rule added at runtime).
- The statement says what to build, defines every edge case the tests check (ties, empty input, repeated calls, what an invalid call returns), and never leaves behaviour for the learner to guess. Include a short "Notes" list for clarifications. No `#` headings (the page renders the h1).
- Tests include the obvious case, each edge case, interleaved operations that expose state bugs, and at least one "the extension works" case. Compute `expected` by running your reference solution, then **read every expected value yourself** against the statement. A wrong expected value that the reference happens to share is the main way these go wrong.
- A time dependency is passed in (`allow(key, nowSec)`), never read from the clock.
- `solution.md` explains the design, not just the code: why the classes are split that way, where the design bends for the next requirement, the cost, and what you would change at scale. It needs a numbered list (`1.`).
- `starter.js` has the class, the constructor and every public method with a one-line JSDoc, and empty bodies. It must not pass the tests.

| Order | Slug | Lesson (`patterns[0]`) | Difficulty |
|---|---|---|---|
| 1 | `tic-tac-toe` | `thinking-in-objects` | Easy |
| 2 | `parking-lot` | `solid` | Medium |
| 3 | `rate-limiter` | `strategy-decorator` | Medium |
| 4 | `pricing-rules` | `strategy-decorator` | Medium |
| 5 | `vending-machine` | `state-observer` | Medium |
| 6 | `event-bus` (done) | `state-observer` | Medium |
| 7 | `text-editor` | `creation-and-commands` | Medium |
| 8 | `eviction-cache` | `strategy-decorator` | Medium |
| 9 | `atm-machine` | `state-observer` | Medium |
| 10 | `expense-splitter` | `strategy-decorator` | Medium |
| 11 | `logger-framework` | `strategy-decorator` | Medium |
| 12 | `snake-and-ladder` | `strategy-decorator` | Medium |
| 13 | `elevator-scheduler` | `state-observer` | Medium |
| 14 | `library-system` | `state-observer` | Medium |

### Check

```bash
npx vitest run tests/lld.test.ts -t tic-tac-toe     # statement/solution rules, reference passes, starter does not, Python reference passes
npx tsc --noEmit
```
