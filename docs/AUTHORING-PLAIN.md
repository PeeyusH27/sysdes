# Plain-language pass: simpler words, fewer of them, more pictures

The brief, from the person who uses the site: *"The language should be simpler throughout, with animation and illustrations for better visual memory, and less content to read but enough to grasp the most information out of it."*

The prose is already short-sentenced (Flesch-Kincaid grade 5 to 7), so long sentences are not the problem. The problems are:

1. **Jargon with no first explanation.** "Cache-aside", "idempotent", "quorum" arrive as if the reader knew them.
2. **Volume.** The core view of a page is a median of 516 words of prose, up to 1,081.
3. **Words where a picture would stick better.**

You are rewriting detail pages to fix all three. The reader is a smart person who has built things but has not studied distributed systems or has forgotten the vocabulary. Think: explaining to a friend over coffee, with a napkin.

## The targets (measured, and checked by a test)

- **Core view prose: about 350 words per page, never more than 600.** "Core" is every `##` section that is not in the page's `detail` list (`content/extras/<section>.ts`). Words outside code blocks and tables count.
- **The whole page: at least 30% fewer words than now** (record before and after with `node scripts/readability.mjs <path>`).
- **Average sentence 14 words or fewer**; paragraphs of 1 to 3 sentences; one idea per paragraph.
- **At most 3 new technical terms per section.** More than that: move the rest to the detail sections or cut it.

## How to write it

1. **Picture first, words second.** Open each core section with the thing in plain words, ideally through the page's analogy (the page's doodle shows it). Then name it. "Keep the answers you need most close by. That is a **cache**." Not: "A cache is a high-speed data storage layer that..."
2. **Say the plain idea, then the term, the first time only.** On first use in a section, write the everyday meaning, then the term in bold: "one copy of the data that only answers reads (a **replica**)". After that use the term freely. Do not define the same term twice on a page. (The site also underlines known terms and shows a definition on tap, so you do not need a full definition in the text: a few plain words are enough.)
3. **Prefer the small word.** "Use" not "utilise", "show" not "demonstrate", "start" not "initiate", "about" not "approximately", "so" not "consequently". No "in order to", "it is important to note", "essentially", "basically", "simply", "obviously".
4. **Active, direct, "you".** "The app checks the cache first" not "The cache is checked first by the application".
5. **Cut hard.** Remove: anything the diagram or widget beside it already shows; history and background nobody needs to answer the question; "in practice teams often..." hedging; a second example of the same thing; a table row that repeats a sentence; restating the page's own TLDR; lists longer than 5 items (keep the 3 to 5 that matter, move the rest to a detail section). If you can say it in four words, do.
6. **Numbers: keep the few that teach.** Keep the ones that change a decision ("about 50 times faster", "100 requests a second"). Round them. Drop the ones that only decorate.
7. **Use a doodle where a picture sticks better than a paragraph.** Add `<Doodle name="..." size={150} caption />` (it sits in the visual pane beside the text) at the start of **at most two** core sections per page, for the ones where an analogy is the whole point. Names are in `src/components/doodle/names.ts` and you can see them all at `/doodles` or in `docs/AUTHORING-EXTRAS.md`. Do not add a doodle that repeats the page's hero doodle (the `doodle` field in `content/extras/<section>.ts`).
8. **Tables in the core are small**: at most 4 rows and 3 columns, plain words in the cells. Bigger tables belong in a detail section (and should still be trimmed).
9. **Questions you ask the reader and answers you give should sound like a person**, not a textbook.

### Example

Before (56 words):
> A cache is a high-speed data storage layer that stores a subset of data, typically transient in nature, so that future requests for that data are served faster than is possible by accessing the data's primary storage location. Caching allows you to efficiently reuse previously retrieved or computed data.

After (27 words):
> Your database is slow and far away. A **cache** keeps the answers you need most in fast memory right next to the app. Most reads never reach the database.

## What you must not change

- **The `##` headings: exact text, order, and count.** Their ids are used by the page's `detail` list in `content/extras/*.ts`, by the shorts' `source` anchors, and by search. Do not add, remove, rename or reorder them. (If a heading is genuinely misleading, leave it and tell me in your report.)
- JSX components and their props: diagrams, widgets, `<Steps>`, `<Callout>`, `<FollowUps>`, `<Quiz>`, `<CodeTabs>`, `<RunCode>`, `<AlgoViz>`, `<Requirements>`. You may shorten the words inside `Steps`, `Callout`, `FollowUp` and `Requirements`, and remove a component only if it truly duplicates another one beside it.
- Code snippets and their tests, `diagrams.ts`, `viz.ts`. (You may shorten a diagram caption or a `description` if it is wordy, but do not change specs' structure.)
- **Facts.** Simpler must stay true. Do not change a number unless it is wrong. If you are not sure a claim is right, keep the original wording.
- `quiz.ts`: you may simplify the question, option and `explain` wording and shorten it. Keep the same number of options, the same `answer` index and the same meaning.
- Imports at the top of the MDX file, and the TLDR (you may shorten the TLDR; it stays at most two sentences).

## Check your work (run these; fix what fails)

```bash
node scripts/readability.mjs <your path>                 # words and grade, before and after
node scripts/check-content.mjs <your path>               # MDX still compiles, components exist
npx vitest run tests/extras.test.ts -t "<section>"       # headings and the detail list still line up
npx vitest run tests/shorts.test.ts tests/content.test.ts tests/section-cards.test.ts
npx tsc --noEmit
```

Run the readability script **before** you start (save the numbers) and after. Report, per page: words before and after, core words after, and anything you left alone on purpose. Do not run `next build` or `next dev` (others are running builds).
