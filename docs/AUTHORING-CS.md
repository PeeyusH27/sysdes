# Authoring the CS fundamentals track

Read `docs/AUTHORING.md` first: MDX rules, section cards, components and style all apply. This file covers what is specific to `/cs`.

The track is 12 short lessons in three groups, registered in `content/cs/registry.ts` (`csLessons`, with `CS_GROUPS` for the group names). Each lesson is a folder `content/cs/lessons/<NN-slug>/` and a route `/cs/<slug>` (`src/app/cs/[slug]/page.tsx`, the same `DocLayout` as the other tracks).

| Group | Lessons |
|---|---|
| Operating systems and concurrency | processes-threads, scheduling-memory, synchronization, concurrency-in-practice |
| Networking | request-journey, tcp-in-depth, http-and-api-styles, sessions-auth-proxies |
| Databases internals | indexes-btree-lsm, transactions-isolation, storage-engine-wal, schema-and-joins |

## Who it is for

Someone who can build things but is asked "what does a context switch cost?", "why does TCP slow down?" or "what is write skew?". Teach the **mechanism behind a one-sentence answer**. A lesson opens with the answer, shows the mechanism with a diagram, widget or tested snippet, names the trade-off, and ends with the follow-ups an interviewer asks next. Link to the sibling pages that already cover a topic (`/learn/databases-scaling`, `/deep-dives/connections-pooling`) instead of repeating them.

## Folder

```
content/cs/lessons/<NN-slug>/
  page.mdx       # body only: title, summary and minutes come from the registry
  quiz.ts        # export const quiz: QuizItem[]  (5 to 8 questions, each with `explain`; this track uses 7)
  diagrams.ts    # optional FlowSpec / SequenceSpec / DecisionSpec / TimelineSpec / ClassSpec
  snippets/<name>.js, <name>.test.js   # JavaScript only, 10 to 70 lines, pure, with a sibling vitest test
```

There are **no Python twins** here: `tests/lld-lessons.test.ts` applies that rule only to the LLD foundations. Do not add Java either.

## The shape of a page

`import { quiz } from './quiz'`, a `<TLDR>` of at most two sentences, then `##` sections, then `## Follow-up questions` with `<FollowUps>` (3 to 5 questions, 1 to 3 sentence answers) and `<Quiz items={quiz} />` as the last line. Include one `<Callout kind="interview" title="What interviewers listen for">` and one `<Callout kind="warning">`. A lesson has 5 to 7 core sections plus 2 to 4 detail sections (see below). `tests/cs.test.ts` checks all of this, plus that links resolve and every non-display snippet has a test and is shown on the page.

Keep the **core under 600 words of prose** (about 450 to 550 is comfortable): `tests/plain.test.ts` counts `FollowUp` answers and callouts, but not tables or code. Check with `node scripts/fold-report.mjs content/cs` and `node scripts/readability.mjs content/cs`. Tables in the core stay at 4 rows and 3 columns.

## Quiz size

`QuizItem` has no cap, and `tests/content.test.ts` only requires at least 3. The CS track asks for 5 to 8 (enforced in `tests/cs.test.ts`, with the correct answer in more than one position). Other tracks keep their 3.

## Wiring a new lesson

1. `content/cs/registry.ts`: add the entry (folder number = `order`).
2. `content/extras/cs.ts`: `detail` (heading slugs without punctuation or underscores, so write "TIME-WAIT", not "TIME_WAIT"), `sayIt`, optional `doodle`.
3. `content/stories/cs/<slug>.ts` and the two lines in `content/stories/index.ts`.
4. `content/shorts/cs.ts`: one or two shorts. Ids must be unique across all shorts files; `source` is `/cs/<slug>#<heading-slug>`.
5. `content/glossary.json` terms, if the lesson introduces any.

Search, the sitemap, the command menu and the readiness map pick the lesson up from the registry. Readiness scores it as read plus quiz (`csSkills` in `src/lib/prep/readiness.ts`); the track is not part of the plan or mock rounds.

## New widgets

Follow the widget rules in `docs/AUTHORING.md`: pure model functions with a test in `src/components/widgets/__tests__/`, a `readout` with `aria-live="polite"`, and register in `src/components/widgets/index.ts`. The track's three: `DeadlockLab`, `CongestionWindow` (reuses the lesson's `congestion.js`), `IndexCostLab`; `cs-widgets.smoke.test.tsx` renders them.

## Check

```bash
node scripts/check-content.mjs content/cs
npx vitest run tests/cs.test.ts tests/content.test.ts tests/extras.test.ts tests/stories.test.ts tests/shorts.test.ts tests/plain.test.ts tests/section-cards.test.ts tests/prep.test.ts
npx vitest run content/cs src/components/widgets
npx tsc --noEmit
```
