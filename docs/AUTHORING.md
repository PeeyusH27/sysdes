# Authoring guide (content + widgets)

The site is Next.js 16 (App Router) + MDX. **Read the finished example first:** `content/learn/04-caching/` (page.mdx, diagrams.ts, quiz.ts, snippets/). Match its depth, tone and structure.

Sources for content:
- `docs/plan/04-learn-path.md` (lessons), `docs/plan/05-deep-dives.md`, `docs/plan/06-interview-questions.md`: the expanded content, code and Q&A to turn into pages. Where they say "(source)", take the text from `docs/reference/source-data.js`.
- `docs/plan/02-animation-system.md` §7: widget catalog.

## Folder per page

```
content/<section>/<dir>/
  page.mdx        # the page body (title, summary, minutes come from content/registry.ts: don't repeat them)
  diagrams.ts     # exported FlowSpec / SequenceSpec / ClassSpec / DecisionSpec / TimelineSpec objects
  quiz.ts         # export const quiz: QuizItem[]  (3 items, each with `explain`)
  snippets/*.js   # code shown on the page via <CodeTabs files={['snippets/a.js']} />
  snippets/*.test.js   # vitest tests for snippets that are pure (no Redis/DB)
```

Do not edit `content/registry.ts`, `src/mdx-components.tsx`, or anything outside your assigned folders unless told to.

## MDX rules (the checker enforces most of these)

- Start with `import` lines (only `./diagrams` and `./quiz`), then `<TLDR>…</TLDR>`. Use `##` for sections (no `#` H1: the layout renders the title). Use `###` sparingly.
- In prose, a `<` followed by a letter/number starts JSX. Write "under 5 ms", "less than", or `&lt;`. Never write `{` or `}` in prose; put them in `inline code`.
- No HTML comments; use `{/* … */}` if needed.
- GFM tables are fine (they render in a styled wrapper). Keep cells short.
- Fenced code blocks (```js, ```sql, ```lua, ```bash, ```ini, ```json, ```http) are highlighted automatically: fine for short SQL/Lua/config. Longer JS goes in `snippets/` and is shown with `<CodeTabs>`.
- Component props must be plain data (strings, numbers, arrays, objects): **no functions**.
- Attribute strings use double quotes, so don't put `"` inside them (`q="What's the shard key?"` is fine).
- Leave a blank line after an opening component tag if you want markdown (lists, bold) inside it, as in the example.
- End question pages with `<FollowUps>` then `<Quiz items={quiz} />`. End lessons/deep dives with interview Q&A (`<FollowUps>`) then `<Quiz items={quiz} />`.

## Sections become cards

Every `##` section is wrapped in a numbered card automatically (`src/lib/mdx/rehype-section-cards.mjs`), with a reading-time estimate, a kind label (Read, Interactive, Code or Practice) and a "Got it" button. Readers can switch between scrolling the page and flipping one card at a time. So:

- Keep each `##` section about one idea. A section that takes more than about 4 minutes to read is a sign it should be split.
- Never write `<LessonSection>` yourself; the plugin adds it.
- Content before the first `##` (the `<TLDR>`) stays outside the cards.

**Split layout.** The same plugin splits each section into text (paragraphs, lists, tables, `TLDR`, `Callout`, `Requirements`, `Steps`, `FollowUps`…) and visuals (every other component, plus top-level fenced code). From 1080 px wide, visuals sit in a sticky column on the left (about 515–690 px wide) and the text on the right; narrower screens stack them, text first. When `###` subsections each have their own visual, each gets its own row. So:

- Never refer to a visual by position ("below", "on the left"). Say "the diagram", "the simulator".
- Put the sentence that says what to try in the same section as its widget or diagram.
- Keep tables to 4 columns or fewer: they sit in the narrower text column.

## Writing style

Short, vivid, correct. Talk to the reader, open each section with a one-line hook (why it matters, or a concrete scene), use one accurate analogy at most, bold only the 1–3 terms worth remembering, and keep every real number. TLDRs are at most 2 sentences; interview answers 1–2 sentences; "common mistakes" lists keep only what the body doesn't already say. No em dashes as glue, no exclamation marks, no emojis.

## Components available in MDX

| Component | Props |
|---|---|
| `TLDR` | children (2–3 sentences) |
| `Callout` | `kind="interview" \| "warning" \| "tip" \| "note"`, optional `title`, children |
| `Requirements` | `functional={[…]}` `nonFunctional={[…]}` `outOfScope={[…]}` (string arrays) |
| `Steps` / `Step` | `<Steps><Step title="…">markdown…</Step></Steps>` (auto-numbered) |
| `FollowUps` / `FollowUp` | `<FollowUp q="Question?">answer markdown</FollowUp>` |
| `Quiz` | `items={quiz}` |
| `CodeTabs` | `files={['snippets/a.js', 'snippets/b.lua']}` optional `titles={[…]}`; optional `java={[…]}` and `python={[…]}` add a site-wide JavaScript / Java / Python switch (used by the LLD questions; their Java and Python tests run in `tests/lld-langs.test.ts`) |
| `CodeBlock` | `src="snippets/a.js"` optional `title` |
| `StatTiles` | `items={[{ label, value, sub? }]}` |
| `BarChart` | `title`, `data={[{ label, value, display? }]}`, `unit`, `scale="linear" \| "log"` |
| `LineChart` | `title`, `x={[…numbers]}`, `series={[{ id, name, values }]}` (max 3, one y-axis), `xLabel`, `yUnit`, `xFormat="percent" \| "number" \| "raw"`, `marker?`, `area?`, `yMax?` |
| `FlowDiagram` | `spec={…}` optional `scenario="id"` |
| `SequenceDiagram` | `spec={…}` (alt blocks become branch tabs) |
| `ClassDiagram` | `spec={…}` |
| `DecisionTree` | `spec={…}` |
| `Timeline` | `spec={…}` |
| Widgets | `CapacityCalculator` (`preset="default" \| "twitter" \| "instagram" \| "url-shortener" \| "chat" \| "news-feed"`), `LatencyHitRatio`, `LoadBalancerSim`, `HashRing`, `TokenBucketViz`, `FixedVsSliding`, `QuorumPlayground`, `PollingRace`, `QueueSim`, `SeatRace`, `DebounceViz`, `LRUViz`, `CircuitBreakerSim`, `AvailabilityCalc`, `RetryStorm`, `KafkaPartitions`, `ReplicationLag`, `VirtualListViz`, `ChatSim`, `PoolSim`, `HandshakeTimeline`, `FanoutCalc`, `TraceWaterfall`, `PatternComparator`, `PriorityLanes`, `Base62Playground`, `InterviewTimer`, `RaftElection`, `ParkingLotSim`, `ElevatorSim`, `VendingMachineSim`, `LeaderboardRace`, `PaymentFlowSim`, `RideMatchSim`, and one lab per DSA pattern (`HashingLab`, `TwoPointersLab`, … `BitLab`; see `src/components/widgets/index.ts`) (no props), `DiagramQuiz` (`spec`, `slot` = node id to hide, `options` = NodeKind[], `answer` = NodeKind, `explain`) |

All types are in `src/components/diagram/types.ts`. Import them in `diagrams.ts`:
`import type { FlowSpec, SequenceSpec, ClassSpec, DecisionSpec, TimelineSpec } from "@/components/diagram/types";`
and `import type { QuizItem } from "@/components/content/Quiz";` in `quiz.ts`.

## Diagram rules

- **Every FlowSpec gets 2–4 scenarios** that narrate a story step by step (happy path, failure, retry, burst…). Captions are full sentences. Use `reverse: true` for replies on the same edge, `with: [...]` for fan-out (parallel packets), `mark: [{ node, state }]` for badges (`hit`, `miss`, `busy`, `down`, `ok`, or `null` to clear), `tone: "miss" | "error"` for coloured packets, `ms` for dwell time.
- Node labels ≤ 18 characters (use `sub` for a second line like `"×3"` or `"~1 ms"`). Unique `id`s, and no two nodes in the same `(col,row)` cell. Layout flows left→right by `col`; keep `col` ≤ 6 and `row` ≤ 3.
- Node kinds: client, dns, cdn, lb, gateway, service, worker, idgen, cache, database, storage, search, queue, pubsub, external.
- Edge `style`: `"async"` for queue/publish edges, `"replication"` for DB replication.
- Sequence diagrams: actors (≤ 6) with kinds; items are messages `{ from, to, label, type: "call" | "reply" | "async" }`, notes `{ note, over: [ids] }`, and `{ alt: [{ when, items }] }` branches (these become clickable tabs: great for "cache hit | cache miss").
- Convert the old Mermaid diagrams described in the plan into these specs by hand.

## Code snippets

- Plain JavaScript, ESM, Node 20+ / modern browsers. Comments explain the *why* briefly.
- If a snippet needs Redis/DB/Express (`redis`, `pool`, `db`, `app`, `queue`), make its **first line** `// @display-only: needs …` (it's hidden from readers and tells tests to skip it).
- Pure snippets (algorithms, calculators, data structures) **must** have a sibling `name.test.js` using `import { test, expect } from 'vitest'`. Verify every number you claim in comments.
- Fix the source bugs listed in `docs/plan/README.md` §5; never port the buggy versions.

## Shorts

`/shorts` is a swipeable feed of one-minute summaries. Each short lives in `content/shorts/` (`system-design.ts`, `deep-dives-questions.ts`, `dsa.ts`) and follows the `Short` type in `content/shorts/types.ts`: a hook, 3–5 bullets, 1–3 "go deeper" groups, optional code (10 lines max) and a `source` link to the page section it summarises. When you change a lesson, update its shorts too. `npx vitest run tests/shorts.test.ts` checks the lengths, the formatting (only `**bold**` and `` `code` ``), and that every `source` anchor exists.

## Check your work (run often)

```bash
node scripts/check-content.mjs content/learn/05     # MDX compiles, components exist, files/imports resolve
npx vitest run content/learn/05-async-messaging      # your snippet tests
npx vitest run tests/content.test.ts                 # diagram/quiz integrity (ignore failures in other people's folders)
npx tsc --noEmit                                     # types (ignore errors in other people's files)
```

**Do not run `next build` or `next dev`** (several people work in parallel; the lead runs the build).

## Widgets (for widget authors)

- One file per widget in `src/components/widgets/<Name>.tsx` (replace the stub, keep the export name). Client component (`"use client"`).
- Wrap in `<WidgetFrame title sub>`; use `Slider`, `Seg` from `./WidgetFrame`; classes `controls`, `wbtn`, `readout`, `sim-svg`, `pill`, `ok-ink`/`warn-ink`/`bad-ink`.
- Simulation logic as **pure functions** (exported) with a test in `src/components/widgets/__tests__/<Name>.test.ts`; use `mulberry32` from `@/lib/rng` for deterministic randomness and `useFixedStep` from `@/lib/sim-loop` for animation loops.
- Pause when off-screen (`useInView`) and respect reduced motion (`useReducedMotion()` → no auto-run; offer a **Step** button).
- Colours: tokens only (`var(--series-1..3)`, `var(--k-*)`, `var(--good)`, `var(--warning)`, `var(--critical)`, `var(--accent)`). Status colours always come with an icon or word.
- Every result also stated in text (a `readout` line with `aria-live="polite"`).
- Charts inside widgets: reuse `BarChart` / `LineChart` / `StatTiles`.
- Look at `CapacityCalculator`, `LatencyHitRatio`, `LoadBalancerSim`, `HashRing` for the pattern.
