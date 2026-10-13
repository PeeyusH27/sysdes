# System Design Suite → Next.js: Implementation Plan

**Source:** `system-design-suite (1).html` is a single-file app (~45 KB) with a hash router. Before Phase 1 starts, copy it to `docs/reference/`, because the content port reads from it.

**Goal:** turn it into a multi-page Next.js site where:

- every topic has its own URL and much deeper content;
- flows, connections and graphs are animated SVG you can step through;
- a drag-and-drop playground lets learners build HLD diagrams;
- every interview question has a detailed answer with steps and JavaScript code.

| File | What it covers |
|---|---|
| [01-architecture.md](01-architecture.md) | Stack, folder structure, routing, content model, theming, search, progress, SEO, performance, accessibility, testing, CI |
| [02-animation-system.md](02-animation-system.md) | The SVG engine: animated flow diagrams with step-through scenarios, sequence/class/decision diagrams, animated charts, the widget catalog |
| [03-hld-playground.md](03-hld-playground.md) | Drag-and-drop HLD builder (it is feasible): React Flow, validation, lint, templates, graded challenges, traffic simulation, sharing |
| [04-learn-path.md](04-learn-path.md) | Home, the HLD path index and all 10 steps, each expanded with sections, diagrams, widgets, JS code, Q&A and quizzes |
| [05-deep-dives.md](05-deep-dives.md) | The 6 deep dives, expanded with new code cards, widgets and comparison tables |
| [06-interview-questions.md](06-interview-questions.md) | Question hub, page template, detailed answers for all 7 questions, and a backlog of 15 new questions |
| [07-dsa-track.md](07-dsa-track.md) | The DSA track added later: JavaScript cheat sheet, 22 patterns with step-by-step algorithm animations, and an in-browser editor with tests, progress and a solution that unlocks after a wrong attempt |

---

## 1. Audit of the source file

| Area | Source symbol | Count | How it renders today |
|---|---|---|---|
| Home | `home()` | 1 page, 3 cards | `innerHTML` strings |
| HLD path | `H[]` | 10 steps (requirements → playbook) | Custom SVG `dg()` (grid layout, dashed edges animated with CSS) plus `ch()` bar and line charts |
| Deep dives | `DD[]` | 6 topics × 5 code cards | Mermaid loaded from a CDN at runtime |
| Questions | `Q[]` + `QX{}` | 7 questions (2 Frontend, 3 Backend, 2 Full-stack) | Template string, plus a Mermaid diagram and approach steps injected by `enrich()` |
| Theme | CSS variables | Dark by default, light through `prefers-color-scheme` | No manual toggle. Two `:root` blocks overlap because the file merges two apps. |

**Limitations the rebuild fixes**

- Hash routes (`#/q/chat`): nothing is indexable, there are no per-page titles or OG images, and the code-split is poor.
- All content lives in JS strings inside one file, so nothing is typed, tested or reusable.
- Mermaid is a multi-megabyte runtime that renders only on the client, picks its theme once at load, and can't be animated step by step.
- Diagrams animate only their dashes. Nothing shows *what* travels *where* or *in what order*.
- Charts are static, and one of them is unreadable (see the bugs table).
- There is no progress tracking, cross-content search, syntax highlighting or copy button.
- Follow-up questions have no answers.
- Several code snippets have real bugs (listed below).

---

## 2. Target sitemap

```
/                          Home: hero with a live request-journey animation, 4 entry cards, "continue where you left off"
/learn                     HLD path overview as an animated "metro map" of the 10 steps with progress
/learn/[step]              10 lesson pages (slugs below)
/deep-dives                Index with animated thumbnails
/deep-dives/[topic]        6 deep-dive pages
/questions                 Hub: filter by category, level and topic; search; state kept in URL params
/questions/[slug]          Question pages (7 now, 20+ planned)
/playground                Free-form drag-and-drop HLD builder
/playground/[challenge]    Guided challenges with automatic grading
/cheatsheet                Numbers to know, formulas, decision tables (printable)
/glossary                  Terms, linked from lessons through <Term> tooltips
```

**Lesson slugs:** `requirements-estimation`, `api-load-balancing`, `databases-scaling`, `caching`, `async-messaging`, `consistency-cap`, `reliability-observability`, `case-url-shortener`, `case-notification-system`, `interview-playbook`

**Deep-dive slugs:** `caching-techniques`, `sharding-strategies`, `choosing-a-data-store`, `polling-sse-websockets`, `connections-pooling`, `request-flows`

**Question slugs** (the source ids are kept): `parking-lot`, `rate-limiter`, `movie-booking`, `typeahead`, `infinite-feed`, `chat`, `news-feed`; added later: `elevator`, `vending-machine`, `leaderboard`, `payment-system`, `ride-sharing`

Old hash links such as `#/q/chat` get a small client redirect on `/` that sends them to `/questions/chat`.

---

## 3. Key decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, App Router**, TypeScript, React 19.2 (re-check with `create-next-app@latest` when you start) | Static generation per page, metadata and OG images, and server components keep content pages light |
| Styling | **Tailwind CSS v4** plus the source's CSS variables, cleaned up into one token set | Keeps the look; dark/light comes from `data-theme` |
| Content | **MDX per page** for prose, **typed TS specs** for diagrams/quizzes/metadata, and **real `.js` snippet files** that tests execute | Prose stays pleasant to write, structured data is type-checked, and code shown to learners is proven to run |
| Highlighting | **Shiki** at build time inside server components, with dual light/dark themes | Highlighting costs zero client JS |
| Diagrams | **Our own SVG engine**: `FlowDiagram`, `SequenceDiagram`, `ClassDiagram`, `DecisionTree`, `Timeline`. Mermaid is dropped. | Step-by-step animation, server-rendered first frame, small bundle, and the theme follows the toggle |
| Animation | **Motion** (`motion/react`) through `LazyMotion`, plus CSS keyframes | Path drawing and packets driven by motion values, with no React re-render per frame. Reduced motion is respected. |
| Charts | **Our own SVG `BarChart` and `LineChart`**, following the dataviz rules in 02 | About 10 small charts don't justify a chart library, and owning them gives full animation control |
| Playground | **React Flow (`@xyflow/react` v12)** + zustand + zundo (undo) + elkjs (auto-layout) | Mature, MIT-licensed, custom nodes and edges, touch support, minimap |
| Drag quizzes in lessons | **dnd-kit** | Keyboard and touch sensors, plus screen-reader announcements |
| Search | **MiniSearch** + a **cmdk** ⌘K palette over a static JSON index | No server needed |
| Client state | **zustand `persist`** in localStorage for progress, bookmarks and designs | No backend in v1 |
| Validation | **zod** for imported or shared designs | Share links and JSON imports are untrusted input |
| Tests | Vitest + Testing Library, Playwright + axe, content-integrity tests | See 01 §11 |
| Hosting | Vercel (or `output: 'export'`, since every route is static) | |

---

## 4. Phases

The estimates assume one developer who knows React. They are rough and meant for sequencing.

| Phase | Scope | Exit criteria | Estimate |
|---|---|---|---|
| **0. Foundation** | Scaffold, tokens, fonts, layout, nav, theme toggle, CI (typecheck, lint, test, build) | Empty routes render in both themes; CI is green | 1–2 days |
| **1. Content port** | Content model, all routes, port 10 + 6 + 7 pages as they are (static diagrams through `fromLegacy`), Shiki, ⌘K search, the source-bug fixes below | Every source page exists at its new URL with fixed code; the content-integrity test passes | 4–5 days |
| **2. Animation system** | FlowDiagram + scenarios, Packet, SequenceDiagram (replaces Mermaid), ClassDiagram, DecisionTree, Timeline, BarChart/LineChart; convert every diagram | No Mermaid left; every diagram has at least one scenario, a text alternative and a reduced-motion path | 5–6 days |
| **3. Depth** | New sections from docs 04–06, P1 widgets, then P2, quizzes, progress tracking, cheatsheet | Each page meets the "definition of done" below | 8–12 days |
| **4. Playground** | Builder MVP → lint → templates → challenges with grading → traffic simulation → share/export | Milestones P4.1–P4.5 in 03 §15 | 8–10 days |
| **5. Expansion and launch** | Question backlog (06 §4), glossary, OG images, performance and accessibility audit, analytics | Lighthouse targets met; 20+ questions | Ongoing |

### Definition of done for every content page

- [ ] Statically generated, with its own `<title>`, description, OG image and canonical URL.
- [ ] Every diagram renders a meaningful first frame without JS, has scenario controls that work from the keyboard, includes a "Text description" alternative, and has a reduced-motion path.
- [ ] Every chart has a hover/focus tooltip, a table view, and a single y-axis.
- [ ] Every code block is highlighted and copyable. Runnable snippets are covered by a test.
- [ ] Interview Q&A and follow-ups include answers. A quiz is present, and finishing it marks the page complete.
- [ ] axe reports no violations, and Lighthouse mobile scores ≥ 90 for performance and 100 for accessibility.

---

## 5. Bugs in the source to fix during the port

These are real defects in the current snippets and charts. Do **not** port them as they are. The corrected code is in docs 04–06.

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | HLD step 5, `handle(msg)` | Sets `done:<id>` **before** sending. If the send fails, the retried message is skipped as a duplicate, so retries never deliver. | Claim a short processing lock, set `done` only after success, release the lock in `finally` (04 §Step 5) |
| 2 | Movie booking, `holdSeats` | `status='available' OR held_until<now()` also matches **booked** seats whose old `held_until` has passed, which allows double booking | `status='available' OR (status='held' AND held_until < now())`, and clear `held_until` on booking (06 §Q3) |
| 3 | HLD step 4, `getProduct` | Retries recursively without a limit while the lock is held, never releases the lock, and doesn't cache "not found" | Bounded retries, compare-and-delete lock release in `finally`, and a short-lived negative-cache sentinel |
| 4 | HLD step 8 text | Says "Base62 of a counter gives short **unpredictable-looking** codes". Sequential ids actually give sequential, guessable codes. | Correct the text and add a bijective scramble (multiply by a constant coprime with 62⁷), shown in 04 §Step 8 |
| 5 | News feed, `getFeed` | The list-offset cursor shifts when new posts are pushed, so pages duplicate or skip items. The celebrity merge is missing. | Sorted set scored by timestamp with a score cursor, plus a read-time celebrity merge (06 §Q7) |
| 6 | Infinite feed, `useInfinite` | If `fetch` throws, `busy` is never reset and the feed stops forever. The IntersectionObserver is never disconnected, and nothing aborts. | `try/finally`, React 19 ref cleanup, and an AbortController (06 §Q5) |
| 7 | Deep dive 4, long polling | On error, `finally { poll() }` re-polls immediately, so a down server causes a tight loop | Exponential backoff with jitter on failure (05 §4) |
| 8 | Deep dive 6, idempotent retries | Two concurrent requests with the same key both miss, so the card is charged twice | `SET key pending NX` before charging; the loser gets 409 (05 §6) |
| 9 | Chat server | Keeps one socket per user (multi-device breaks), never unsubscribes, has no membership check, and doesn't address ordering | `Map<userId, Set<ws>>`, unsubscribe on last close, per-conversation `seq`, unique `clientId` (06 §Q6) |
| 10 | Rate limiter Lua | Uses the app server's clock (skew between servers). `HMSET` is deprecated. `Retry-After` is hard-coded to 1. | Redis `TIME`, `HSET`, compute the retry delay from the token deficit (06 §Q2) |
| 11 | Deep dive 1, write-behind | Clears the buffer **before** `bulkUpsert` succeeds, so a failed flush loses data. Async flushes can also overlap. | Re-merge the batch on failure (without overwriting newer writes) and add a `flushing` guard (05 §1) |
| 12 | Deep dive 2, consistent hashing | `ring.find(...)` is a linear scan per lookup | Binary search (05 §2) |
| 13 | HLD step 7 chart | "Downtime per year" uses a linear scale, so the 99.99% (53 min) and 99.999% (5 min) bars are invisible next to 5,256 | Labelled log scale, human-readable durations, and a table view (02 §6) |
| 14 | HLD step 1 chart | 350 / 3,500 / 35,000 on a linear scale makes the first bar about 1% tall | Replace it with three stat tiles linked to the capacity calculator (02 §6) |
| 15 | HLD step 4 chart | A miss costs the cache check *plus* the DB call (51 ms), not 50 ms | Show the formula `h·c + (1−h)·(c+d)` with live sliders |
| 16 | Questions hub | `cat` and `term` are globals that reset on reload and can't be shared | URL search params (`?cat=Backend&lv=Medium&q=rate`) |
| 17 | Deep dive 3, relational card | `UPDATE stock … AND qty > 0` ignores `rowCount`, so the order commits even when nothing was in stock | Decrement first, and roll back with an out-of-stock error when `rowCount === 0` (05 §3) |

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope creep (about 27 widgets plus a playground) | Widgets are prioritised P1/P2/P3 in 02 §7. Phase 3 ships the P1 widgets first, and each widget is self-contained. |
| Animation overload hurting reading and performance | Animations play on demand (scenario player), pause off-screen, and respect reduced motion. Only the home hero loops automatically. |
| Content accuracy | Snippets live in real files with tests. Numbers come from formulas, not hand-typed values. A review checklist covers every page. |
| Playground scope | Ship the MVP (P4.1) first. Grading and simulation are additive milestones. |
| Library churn (Next, Motion, React Flow majors) | Pin exact versions in the lockfile and upgrade deliberately. Wrap Motion and React Flow behind our own components. |
