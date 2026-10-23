# Authoring stories (the step-by-step walkthrough)

A detail page opens on a **story**: 6 to 9 steps, each one picture and one short line, with a guess now and then. It replaces reading as the first thing a learner does; the written lesson is one click away ("Full lesson"). The reader should be able to get the idea from the pictures alone. Words only say what to notice.

Files: `content/stories/<section>/<slug>.ts`, one per page (`learn`, `deep-dives`, `questions`, `patterns`, `lld`, `cs`; slugs are in `content/registry.ts`, `content/dsa/registry.ts` and `content/lld/registry.ts`). Each exports `export const story: Story | undefined = {...}` (currently `undefined`). Types: `content/stories/types.ts`. Model to copy: `content/stories/deep-dives/sharding-strategies.ts`. The last step ("Say it in 30 seconds") is added automatically from the page's `sayIt` in `content/extras`, so do not write it.

Check with `npx vitest run tests/stories.test.ts -t "<section>/<slug>"`, then `npx tsc --noEmit`. Do not run `next build` or `next dev`.

## Part 1: "Understand it" (`learn`)

A story has two parts. **Part 1, `learn`, teaches the topic from zero** before any animation: 3 to 6 steps, each a short plain explanation next to a **real example**. Part 2 (`steps`, below) is the animated walkthrough. The player shows them as one run ("Part 1 · Understand it", then "Part 2 · See it run"). `learn` is optional; a page without it opens straight on Part 2.

Each learn step: `head` (at most 7 words), `body` (15 to 45 words, 2 or 3 short sentences), `eg` (the example's title, at most 6 words) and `example` (12 to 38 words), plus an optional `doodle` (at most 2 per story).

How to write it:
- Teach in the order a newcomer needs it: **what it is**, **why it exists** (the pain it removes), **how it works**, **the price or catch**, **when to use it**. The first step answers "what is X?" with no jargon you have not explained.
- Say the thing before you name it. Define a term the first time you use it, in the same sentence.
- The example is the point. It is a real, familiar situation (a library notepad, a coat check, a shop with one till) or a real product behaviour you are certain about. It must map cleanly onto the idea: after reading it, the learner should be able to say what plays the part of the cache, the key, the queue. Do not use an example that only sounds clever.
- Numbers must agree with the page and with Part 2.
- Plain words, short sentences. No em dashes as glue, no exclamation marks, no emojis.

Models: `content/stories/learn/caching.ts`, `content/stories/patterns/two-pointers.ts`. Checked by `tests/stories.test.ts`.

## The shape of a story

Think of a 90-second whiteboard talk. A good order (not a template to fill blindly; drop or merge steps that do not apply):

1. **pain**: a concrete situation where the plain approach breaks. Often a `flow` playing a "without" scenario, or a `versus`.
2. **sum**: "do the sum first". A `sum` scene with 2 to 4 rows and a verdict that shows when you do NOT need the thing.
3. **sum** or **choose**: a `meter` the reader drags (a number where the verdict flips: no, not yet, yes), with a `predict` before it.
4. **idea**: the mechanism, as a `flow` playing the "with" scenario (or a `doodle` for an analogy).
5. **choose**: good and bad options as `verdicts`, one short reason each, with a `predict`.
6. **catch**: the vivid failure as `bars` (one bar red), a `flow`, or a `versus`.
7. **skip**: "when not to use it / try this first", usually a `versus`.

Every step has `tag` (`pain | idea | sum | choose | fix | catch | skip`), `head` (at most 6 words), `line` (at most 18 words, plain, no jargon you have not just shown), and a `scene`.

## Scenes

| kind | use it for | limits |
|---|---|---|
| `flow` | an animated diagram playing one scenario, looping, no controls | `spec` + `scenario` id that exists; at most 7 nodes; scenario 3 to 8 steps; node labels at most 18 chars |
| `sum` | arithmetic that lands on a verdict | 2 to 4 rows (label at most 5 words, value at most 14 chars), a result, a verdict (at most 8 words, tone good/bad/warn/info) |
| `meter` | a slider; the verdict changes with the number | `stops` 3 or 4, ascending `upTo`, the last reaches `max`; `log: true` for wide ranges; each verdict at most 10 words |
| `bars` | compare numbers at a glance | 2 to 5 bars; `value` is a plain number, `shown` the label ("6 ms"); `tone` colours it |
| `verdicts` | options marked good / so-so / bad | 3 to 5 items, label at most 18 chars, reason at most 10 words |
| `versus` | two columns: before and after, try first and then | 2 to 4 points each, at most 7 words per point |
| `trace` | a DSA pattern's own step-through animation (a trace exported from the pattern's `viz.ts`), looping, no controls or code | `preset` is the label of one of its `presets`; 3 to 16 frames; import it: `import { pairSum } from "../../dsa/patterns/02-two-pointers/viz";` |
| `classes` | an LLD class diagram at one build-up stage, one stage per step | the `ClassSpec` (from the lesson's `diagrams.ts`) must have `stages`; `stage` counts from 0; the new classes are highlighted |
| `doodle` | one big hand-drawn analogy | at most 2 per story; a name from `src/components/doodle/names.ts` |

Rules the test enforces: the first step is a `pain`; the last is a `catch` or a `skip`; there is a `sum` or `choose` step; at least 3 different kinds of scene; no scene kind twice in a row (except `flow`); the whole story is at most 260 words including the scenes.

## Questions to the reader (`predict`)

1 to 3 per story. `{ q (at most 12 words), options (2 or 3, at most 8 words each), answer (index), why (at most 20 words) }`. The picture on that step is **blurred until the reader guesses**, so ask something the picture answers; do not ask something the line already says. Good: "At 3,000 writes a second, do you shard?" (the meter then shows it). Bad: a question whose answer is in the step's own `line`.

## Where the pictures come from

Reuse before you draw. Imports go from `content/stories/<section>/<slug>.ts`:

- The page's own diagrams: `import { shardRouter } from "../../deep-dives/02-sharding-strategies/diagrams";` (also `../../learn/<dir>/diagrams`, `../../questions/<slug>/diagrams`). Use one only if it has 7 or fewer nodes; otherwise pick another.
- A primer's flow: `import { getPrimer } from "../../primers"; const flow = getPrimer("cache")!.flow;` (ids in `content/primers/types.ts`; 3 to 6 nodes, scenarios "without", "with", sometimes a third).
- Or write a small `FlowSpec` inline in the story file (types in `src/components/diagram/types.ts`; look at `content/primers/cache.ts` for the shape: nodes on a grid with `col`/`row`, edges, `scenarios` with `steps` of `{ edge: "a>b", caption, tone?, mark? }`). Captions at most 16 words.

## Truth and tone

- Numbers must agree with the page (`page.mdx`, its `diagrams.ts`) and with `sayIt` in `content/extras/<section>.ts`. Read both first. Illustrative numbers are fine if hedged in the line ("roughly") and clearly an example; never invent benchmarks.
- Plain words. Short sentences. Name a thing by showing it before you call it by its jargon name.
- No em dashes as glue, no exclamation marks, no emojis.

## DSA pattern stories (`patterns/<slug>.ts`)

Models: `content/stories/patterns/two-pointers.ts`. The picture is the pattern's own animation. Arc: **pain** (a `sum`: the brute-force cost at n = 100,000, or a `versus`), **idea** (`trace` of the main example, with a `predict` on the first decision), **sum** (`bars` or a `meter` over n: brute force against the pattern), **choose** ("spot it in the problem": `verdicts` of problem phrasings that do and do not fit, with a `predict`), a second **idea** (`trace` of a variant, if the page has one), **catch** (`versus`: the usual slips and their fix). Read the page's `<AlgoViz trace={...}>` uses (they name the exports of its `viz.ts`), its "Spot it" callout and complexity table, and keep complexities exactly as the page states them. If a pattern page has no `AlgoViz` (a custom lab instead), use `doodle`, `bars`, `verdicts` and `versus` and say so in your report.

## LLD foundation stories (`lld/<slug>.ts`)

Model: `content/stories/lld/strategy-decorator.ts`. The picture is the lesson's class diagram growing stage by stage. Arc: **pain** (`classes` stage 0, or `versus` of the code that hurts), **sum** (a `meter` where the verdict flips from "a plain if is fine" to "pull it into a class", with a `predict`), the **idea** as one `classes` step per stage (2 to 3 steps), **choose** (`versus`: plain code or the pattern, and when), **catch** (`verdicts` or `classes` of the over-engineering trap, such as a factory for one rule), end on a **skip**. Read the lesson page and its `diagrams.ts` first; every claim must match.
