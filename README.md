# DSA & System Design

A Next.js site for interview preparation with two tracks:

- **DSA** (`/dsa`): a JavaScript-for-DSA cheat sheet with runnable snippets, 22 patterns explained step by step with animations synced to the code, and practice problems solved in an in-browser editor. Tests run in a Web Worker, solved problems are tracked, and a step-by-step solution unlocks after the first wrong submission.
- **System design** (`/system-design`): a 10-step HLD path, 6 deep dives and 12 interview questions (including LLD classics: parking lot, elevator, vending machine) with detailed JavaScript answers. Diagrams are animated SVG you can play, pause and step through; widgets simulate load balancers, caches, queues, a parking lot with cars driving to their spots, a bank of elevators, and more; and a drag-and-drop playground lints, simulates and grades your designs.

Every lesson is a stack of section cards you can tick off, or flip through one at a time in Cards mode. **Shorts** (`/shorts`) cover both tracks as one-minute bullet-point cards: on a phone you swipe sideways for the next one and scroll down to read more; on desktop you use the arrows or ←/→.

The implementation plans are in [`docs/plan/`](docs/plan/README.md) (the DSA track is [`07-dsa-track.md`](docs/plan/07-dsa-track.md)). Content conventions are in [`docs/AUTHORING.md`](docs/AUTHORING.md) and [`docs/AUTHORING-DSA.md`](docs/AUTHORING-DSA.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Checks

```bash
npm test                     # Vitest: snippet tests, widget logic, playground logic, content integrity,
                             # and every DSA reference solution run against its tests

npm run check:content        # compiles every MDX file and checks components, imports and code files
npm run typecheck
npx playwright test          # end-to-end (builds must exist: run `npm run build` first)
```

## Where things live

| Path | What |
|---|---|
| `content/registry.ts` | Titles, slugs, summaries and order of every page |
| `content/learn/<step>/` | Lesson pages: `page.mdx`, `diagrams.ts`, `quiz.ts`, `snippets/*.js` (+ tests) |
| `content/deep-dives/<topic>/`, `content/questions/<slug>/` | Same shape |
| `src/components/diagram/` | The SVG engine: `FlowDiagram` (scenarios + packets), `SequenceDiagram`, `ClassDiagram`, `DecisionTree`, `Timeline` |
| `src/components/charts/` | `BarChart`, `LineChart`, `StatTiles` (validated colour palette, tooltips, table views) |
| `src/components/widgets/` | Interactive simulators used in MDX |
| `src/components/playground/` | React Flow builder: store (undo/autosave), lint rules, grader, traffic simulator, share links, challenges |
| `src/mdx-components.tsx` | Every component available to MDX |
| `content/dsa/registry.ts` | DSA patterns and JavaScript cheat sheet topics |
| `content/dsa/patterns/<NN-slug>/` | Pattern lessons: `page.mdx`, `viz.ts` (animation traces), `quiz.ts`, `snippets/` |
| `content/dsa/js/` | Cheat sheet topics (`<NN-id>.mdx`) and their runnable snippets |
| `content/dsa/problems/<slug>/` | Problems: `problem.json` (tests), `statement.md`, `solution.md`, `solution.js` |
| `content/shorts/` | One-minute shorts for `/shorts` (schema in `types.ts`, validated by `tests/shorts.test.ts`) |
| `src/lib/mdx/rehype-section-cards.mjs` | Wraps every `##` section of an MDX page in a `LessonSection` card |
| `src/components/layout/Reader.tsx` | Lesson reader: section progress, Scroll / Cards modes, the live "On this page" map |
| `src/components/shorts/` | The shorts deck (swipe / keys / URL), home-page teaser |
| `src/components/algo/` | Algorithm animation engine: `defineTrace` + view builders, `AlgoPlayer` |
| `src/components/dsa/`, `src/lib/dsa/` | Problem workspace, CodeMirror editor, runner client, progress store, problem loader |
| `public/dsa-runner.js` | The sandboxed test runner (Web Worker in the browser, evaluated directly in tests) |

## Adding a DSA problem

Create `content/dsa/problems/<slug>/` with `problem.json`, `statement.md`, `solution.md` and `solution.js` (see `docs/AUTHORING-DSA.md`), then run `npx vitest run tests/dsa.test.ts -t <slug>`. It appears in the problem list and on its pattern page automatically.

## Adding a page

1. Add an entry to `content/registry.ts`.
2. Create the folder with `page.mdx`, `diagrams.ts`, `quiz.ts` and `snippets/` following `docs/AUTHORING.md`.
3. Run `npm run check:content` and `npm test`.
