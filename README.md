# System Design Suite

A Next.js site for learning high-level system design: a 10-step HLD path, 6 deep dives and 7 interview questions with detailed JavaScript answers. Diagrams are animated SVG you can play, pause and step through; widgets simulate load balancers, caches, queues and more; and a drag-and-drop playground lints, simulates and grades your designs.

The implementation plan this was built from is in [`docs/plan/`](docs/plan/README.md). Content conventions are in [`docs/AUTHORING.md`](docs/AUTHORING.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Checks

```bash
npm test                     # Vitest: snippet tests, widget logic, playground logic, content integrity
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

## Adding a page

1. Add an entry to `content/registry.ts`.
2. Create the folder with `page.mdx`, `diagrams.ts`, `quiz.ts` and `snippets/` following `docs/AUTHORING.md`.
3. Run `npm run check:content` and `npm test`.
