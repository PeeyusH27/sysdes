# 01: Architecture

## 1. Stack and setup

```bash
# Scaffold into this folder (docs/ is on create-next-app's list of allowed existing files;
# if it ever complains, scaffold into a temp folder and move the files over)
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"

# Runtime
npm i motion @xyflow/react zustand zundo elkjs zod lz-string html-to-image \
      @dnd-kit/core minisearch cmdk next-themes clsx lucide-react
# Content
npm i @next/mdx @mdx-js/loader @mdx-js/react @types/mdx remark-gfm rehype-slug shiki
# Tests
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom \
         @playwright/test @axe-core/playwright
```

| Package | Used for |
|---|---|
| `next` 16, `react` 19.2 | App Router, server components, `useEffectEvent`, ref cleanup functions |
| `tailwindcss` 4 | Utility CSS on top of our tokens |
| `motion` | `motion/react`: path drawing, packets, layout transitions, `useReducedMotion`, `useInView` |
| `@xyflow/react` 12 | Playground canvas |
| `zustand` 5 + `zundo` | Playground and progress state, undo/redo |
| `elkjs` | Auto-layout in the playground |
| `zod` | Validating imported and shared designs |
| `lz-string` | Compressed share links |
| `html-to-image` | PNG export from the playground. Pin the version React Flow's export example uses, because some later versions had export bugs. |
| `@dnd-kit/core` | Drag-to-slot quizzes inside lessons |
| `minisearch` + `cmdk` | ⌘K search |
| `next-themes` | Theme toggle with no flash on load |
| `shiki` | Build-time syntax highlighting |
| `lucide-react` | Node-kind icons (they nest inside our SVG) |

Next 16 notes: Turbopack is the default bundler. `next lint` is gone, so run ESLint directly in CI. Route `params` are a `Promise` and must be awaited. Remark and rehype plugins passed to `@next/mdx` must be given **as strings** under Turbopack, for example `remarkPlugins: [['remark-gfm', {}]]`.

## 2. Folder structure

```
.
├─ content/                              # everything a writer touches; no React here
│  ├─ registry.ts                        # ordered metadata for every page (nav, search, sitemap, filters)
│  ├─ learn/
│  │  └─ 01-requirements-estimation/
│  │     ├─ page.mdx                     # prose + embedded components
│  │     ├─ diagrams.ts                  # FlowSpec / SequenceSpec / chart data
│  │     ├─ quiz.ts                      # multiple-choice questions
│  │     └─ snippets/                    # real JS files shown on the page AND imported by tests
│  │        ├─ estimate.js
│  │        └─ estimate.test.js
│  ├─ deep-dives/<slug>/…                # same shape
│  ├─ questions/<slug>/…                 # same shape + challenge.ts (playground rubric)
│  ├─ glossary.ts
│  └─ cheatsheet.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx  page.tsx  not-found.tsx  sitemap.ts  robots.ts  opengraph-image.tsx
│  │  ├─ learn/page.tsx  learn/[slug]/page.tsx  learn/[slug]/opengraph-image.tsx
│  │  ├─ deep-dives/page.tsx  deep-dives/[slug]/page.tsx
│  │  ├─ questions/page.tsx  questions/[slug]/page.tsx
│  │  ├─ playground/page.tsx  playground/[challenge]/page.tsx
│  │  ├─ cheatsheet/page.tsx  glossary/page.tsx
│  │  └─ search-index.json/route.ts      # static JSON built at build time
│  ├─ components/
│  │  ├─ layout/    SiteNav, ThemeToggle, CommandMenu, LessonLayout, QuestionLayout, Toc, PrevNext, ProgressRing
│  │  ├─ content/   Callout, CodeBlock, CodeTabs, CopyButton, Steps, Step, Requirements, ApiTable,
│  │  │             TradeOffTable, FailureModes, FollowUps, Quiz, NumbersTable, StatTiles, Term, TLDR
│  │  ├─ diagram/   FlowDiagram, FlowNode, FlowEdge, Packet, ScenarioControls, useScenario,
│  │  │             SequenceDiagram, ClassDiagram, DecisionTree, Timeline, layout.ts, kinds.ts, fromLegacy.ts
│  │  ├─ charts/    BarChart, LineChart, ChartTooltip, ChartTable, scales.ts
│  │  ├─ widgets/   CapacityCalculator, LoadBalancerSim, HashRing, TokenBucketViz, QuorumPlayground, … (02 §7)
│  │  └─ playground/ Canvas, Palette, Inspector, LintPanel, SimPanel, GradePanel, nodes/, edges/,
│  │                 store.ts, rules.ts, lint.ts, grader.ts, simulate.ts, autolayout.ts, share.ts, schema.ts
│  ├─ lib/          content.ts, shiki.ts, progress.ts, use-hydrated.ts, sim/ (pure simulation logic), rng.ts, cn.ts, format.ts
│  └─ styles/globals.css
├─ src/mdx-components.tsx                # required by @next/mdx (must sit in src/ when using src/)
├─ tests/e2e/*.spec.ts
└─ docs/plan/…
```

Add a path alias for content in `tsconfig.json`: `"paths": { "@/*": ["./src/*"], "@content/*": ["./content/*"] }`.

## 3. Routing and rendering

Every content route is **statically generated** at build time, and unknown slugs return 404.

```tsx
// src/app/learn/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { learnSteps, getLearnStep } from '@content/registry';
import { LessonLayout } from '@/components/layout/LessonLayout';
import { boundComponents } from '@/components/content/bound';

export const dynamicParams = false;                      // only the slugs below exist

export function generateStaticParams() {
  return learnSteps.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const step = getLearnStep((await params).slug);
  return step ? { title: step.title, description: step.summary, alternates: { canonical: `/learn/${step.slug}` } } : {};
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const step = getLearnStep((await params).slug);
  if (!step) notFound();
  const { default: Body } = await import(`@content/learn/${step.dir}/page.mdx`);
  return (
    <LessonLayout step={step}>
      {/* CodeBlock/CodeTabs get the page folder so MDX can say src="snippets/x.js" */}
      <Body components={boundComponents(`learn/${step.dir}`)} />
    </LessonLayout>
  );
}
```

`/deep-dives/[slug]` and `/questions/[slug]` follow the same pattern. `/questions` reads filters from `useSearchParams()` inside a client component, which **must be wrapped in `<Suspense>`**. Without it, the static build fails or bails out of static rendering.

**Server vs client split**

| Server components (no JS shipped) | Client components (`'use client'`) |
|---|---|
| Layouts, MDX bodies, CodeBlock (Shiki), tables, TL;DR, requirements, follow-ups | FlowDiagram and the other diagrams (the first frame is still server-rendered), charts (tooltips), widgets, Quiz, CopyButton, CommandMenu, ThemeToggle, the whole playground |

Client components are still **server-rendered to HTML**, so a diagram's static frame appears before hydration and without JS. Animation is an enhancement on top of a complete picture.

## 4. Content model

### 4.1 Registry (single source for nav, search, filters and sitemap)

```ts
// content/registry.ts
export type Level = 'Easy' | 'Medium' | 'Hard';
export type Category = 'Frontend' | 'Backend' | 'Full-stack';

export interface LearnStep {
  slug: string; dir: string; order: number;
  title: string; short: string; summary: string;
  minutes: number; tags: string[]; outcomes: string[];
}
export interface DeepDive { slug: string; dir: string; order: number; title: string; summary: string; minutes: number; tags: string[] }
export interface Question {
  slug: string; title: string; category: Category; level: Level; summary: string;
  minutes: number; tags: string[];
  related: string[];            // hrefs of lessons / deep dives
  challenge?: string;           // playground challenge slug
}

export const learnSteps: LearnStep[] = [
  { slug: 'requirements-estimation', dir: '01-requirements-estimation', order: 1, title: 'Requirements and Estimation',
    short: 'Requirements', minutes: 25, tags: ['estimation', 'requirements'],
    summary: 'Every design starts with what to build and how big it is.',
    outcomes: ['Turn a vague prompt into functional and non-functional requirements', 'Estimate QPS, storage, bandwidth and servers in under 5 minutes'] },
  // … 9 more, in order
];

export const questions: Question[] = [
  { slug: 'rate-limiter', title: 'Design a Rate Limiter', category: 'Backend', level: 'Medium', minutes: 35,
    summary: 'Asked both as an algorithm question and as a distributed system question.',
    tags: ['redis', 'lua', 'token-bucket', 'gateway'], related: ['/learn/api-load-balancing', '/deep-dives/request-flows'],
    challenge: 'rate-limiter' },
  // …
];

export const getLearnStep = (slug: string) => learnSteps.find(s => s.slug === slug);
export const allPages = () => [
  ...learnSteps.map(s => ({ href: `/learn/${s.slug}`, title: s.title, section: 'Learn', tags: s.tags, file: `learn/${s.dir}/page.mdx` })),
  // deep dives, questions …
];
```

### 4.2 MDX page anatomy

```mdx
{/* content/learn/02-api-load-balancing/page.mdx */}
import { requestPath } from './diagrams'
import { quiz } from './quiz'

<TLDR>Keep services stateless, put a load balancer in front, and make every write safe to retry.</TLDR>

## Why it matters
One server is both a capacity limit and a single point of failure…

<FlowDiagram spec={requestPath} />

<Callout kind="interview">Say "stateless" in the first minute. It is what lets you add machines.</Callout>

<CodeTabs files={['snippets/round-robin.js', 'snippets/least-connections.js', 'snippets/smooth-weighted-rr.js']} />

<LoadBalancerSim />

<Quiz items={quiz} />
```

`FlowDiagram`, `CodeTabs`, `Callout`, the widgets and the other components are provided globally by `src/mdx-components.tsx`, so pages don't import them.

### 4.3 Snippets are real files

The JS a learner reads is the same file a test runs:

```tsx
// src/components/content/CodeBlock.tsx (server component)
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { highlight } from '@/lib/shiki';
import { CopyButton } from './CopyButton';

export async function CodeBlock({ base, src, code, lang, title }: {
  base?: string; src?: string; code?: string; lang?: string; title?: string;
}) {
  const source = code ?? (await readFile(path.join(process.cwd(), 'content', base ?? '', src!), 'utf8'));
  const language = lang ?? src?.split('.').pop() ?? 'js';
  const html = await highlight(stripTestMarkers(source).trim(), language);
  return (
    <figure className="code-block">
      {(title ?? src) && <figcaption>{title ?? src}</figcaption>}
      <div dangerouslySetInnerHTML={{ __html: html }} />  {/* Shiki output from our own files */}
      <CopyButton text={source.trim()} />
    </figure>
  );
}
// stripTestMarkers removes lines tagged `// @hide` (imports of fakes, etc.)
```

Snippets that need Redis or Postgres start with a `// @display-only` header. CI still type-checks them with `tsc --allowJs --checkJs --noEmit` against small ambient declarations (`redis`, `pool`, `queue`), so typos are caught even though the snippet isn't executed.

### 4.4 Shiki (zero client JS)

```ts
// src/lib/shiki.ts
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Promise<Highlighter> | undefined;

export async function highlight(code: string, lang: string) {
  highlighter ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['js', 'jsx', 'ts', 'tsx', 'sql', 'lua', 'json', 'bash', 'http', 'yaml'],
  });
  return (await highlighter).codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,                       // emit --shiki-light / --shiki-dark variables
  });
}
```

```css
.shiki, .shiki span { color: var(--shiki-light); background-color: var(--shiki-light-bg); }
[data-theme='dark'] .shiki, [data-theme='dark'] .shiki span { color: var(--shiki-dark); background-color: var(--shiki-dark-bg); }
```

## 5. Theming and design tokens

The source's two overlapping `:root` blocks are merged into one token set. The **dark palette stays the default look**, and light mode reuses the source's light values.

```css
/* src/styles/globals.css */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

:root {                                   /* light */
  --bg:#f3f6f4; --card:#ffffff; --border:#d6dfdb; --fg:#17211e; --muted:#586861;
  --accent:#0b7a63; --accent-2:#a35f00; --code-bg:#12201c;
  /* node kinds (diagram strokes + legend swatches; always paired with an icon) */
  --k-client:#1d6fd1; --k-gateway:#7a4fd6; --k-service:#0b8a70; --k-database:#b36b00;
  --k-cache:#d23a50; --k-queue:#3f9a1f; --k-external:#5d6e76;
  /* chart series: validated, see 02 §6 */
  --series-1:#0b8a70; --series-2:#b36b00; --series-3:#1d6fd1;
  --chart-surface:#ffffff; --grid:#e3e9e6; --axis:#c3cdc9;
  /* status: always with an icon + label */
  --good:#0ca30c; --warning:#fab219; --serious:#ec835a; --critical:#d03b3b;
}
[data-theme=dark] {
  --bg:#0b1110; --card:#141d1b; --border:#243230; --fg:#e8efec; --muted:#92a39d;
  --accent:#46d6b4; --accent-2:#f4b95a; --code-bg:#070c0b;
  --k-client:#5aa9ff; --k-gateway:#b48cff; --k-service:#46d6b4; --k-database:#f4b95a;
  --k-cache:#ff7a8a; --k-queue:#8be26a; --k-external:#8fa0a8;
  --series-1:#19a07f; --series-2:#c98500; --series-3:#3987e5;
  --chart-surface:#141d1b; --grid:#22302d; --axis:#33433f;
}
@theme inline {
  --color-bg: var(--bg); --color-card: var(--card); --color-border: var(--border);
  --color-fg: var(--fg); --color-muted: var(--muted);
  --color-accent: var(--accent); --color-accent-2: var(--accent-2);
}
body { background: var(--bg); color: var(--fg); }
```

```tsx
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes';

export const metadata = {
  metadataBase: new URL('https://example.com'),
  title: { default: 'System Design Suite', template: '%s · System Design Suite' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteNav />
          <main id="main">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Typography uses `next/font` with Inter (or Geist) for UI and JetBrains Mono for code. Body text stays at 16px/1.65, the same as the source.

## 6. Layout and navigation

- **SiteNav** is sticky: Home, Learn, Deep dives, Questions, Playground, the ⌘K search button and the theme toggle. On narrow screens it collapses into a sheet.
- **LessonLayout** has three columns on desktop: a step list with progress ticks on the left, content in the middle (max 760px), and an "On this page" table of contents on the right (from `rehype-slug` ids). On mobile there's a single column with a sticky progress bar.
- Every lesson, deep dive and question ends with **PrevNext** cards.
- **Reading progress** is a thin bar under the nav. The **Mark complete** control is also triggered automatically when the quiz score is ≥ 2/3.

## 7. Search (⌘K)

```ts
// src/app/search-index.json/route.ts: emitted as a static file at build time
import { allPages } from '@content/registry';
import { mdxToPlainText } from '@/lib/content';          // remark + remark-mdx + mdast-util-to-string

export const dynamic = 'force-static';

export async function GET() {
  const docs = await Promise.all(allPages().map(async p => ({
    id: p.href, title: p.title, section: p.section, tags: p.tags.join(' '),
    body: (await mdxToPlainText(p.file)).slice(0, 6000),
  })));
  return Response.json(docs);
}
```

```tsx
// src/components/layout/CommandMenu.tsx (client)
const index = new MiniSearch({
  fields: ['title', 'tags', 'body'],
  storeFields: ['title', 'section'],
  searchOptions: { boost: { title: 3, tags: 2 }, prefix: true, fuzzy: 0.2 },
});
// Lazily fetch /search-index.json the first time the palette opens, then index.addAll(docs).
// Render with <Command shouldFilter={false}> because MiniSearch already ranks the results.
```

## 8. Progress, bookmarks and quiz scores

```ts
// src/lib/progress.ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Progress = {
  done: Record<string, number>;            // href -> completedAt
  quiz: Record<string, number>;            // href -> best score (0..1)
  bookmarks: string[];
  toggleDone: (href: string) => void;
  saveQuiz: (href: string, score: number) => void;
  toggleBookmark: (href: string) => void;
};

export const useProgress = create<Progress>()(persist(set => ({
  done: {}, quiz: {}, bookmarks: [],
  toggleDone: href => set(s => {
    const done = { ...s.done };
    if (done[href]) delete done[href]; else done[href] = Date.now();
    return { done };
  }),
  saveQuiz: (href, score) => set(s => ({
    quiz: { ...s.quiz, [href]: Math.max(score, s.quiz[href] ?? 0) },
    done: score >= 2 / 3 && !s.done[href] ? { ...s.done, [href]: Date.now() } : s.done,
  })),
  toggleBookmark: href => set(s => ({
    bookmarks: s.bookmarks.includes(href) ? s.bookmarks.filter(b => b !== href) : [...s.bookmarks, href],
  })),
}), { name: 'sds-progress', version: 1 }));
```

localStorage only exists on the client, so anything that renders progress waits for hydration. This avoids hydration mismatches:

```ts
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
// const hydrated = useHydrated(); const done = useProgress(s => s.done);
// return hydrated ? <ProgressRing value={…} /> : <ProgressRing value={0} />;
```

## 9. SEO

- `generateMetadata` on every dynamic route provides the title, description and canonical URL.
- `src/app/sitemap.ts` and `robots.ts` are generated from the registry.
- `opengraph-image.tsx` per section uses `ImageResponse` from `next/og`: the title plus a simplified, non-animated drawing of the page's main diagram.
- JSON-LD uses `TechArticle` for lessons, deep dives and questions. Don't use `QAPage`; it's meant for user-generated Q&A forums.
- Headings follow h1 → h2 → h3 without skipping levels, and anchors come from `rehype-slug`.

## 10. Performance and accessibility budgets

| Metric | Content pages | `/playground` |
|---|---|---|
| First-load JS (gzip) | ≤ 150 KB | ≤ 320 KB (React Flow and elkjs load only here, elkjs lazily) |
| LCP (mobile, 4G) | < 2.0 s | < 2.5 s |
| CLS | < 0.05 | < 0.05 |
| INP | < 200 ms | < 200 ms |

- Use `LazyMotion` with `domAnimation` and `m.*` components on content pages, and the full `motion` only in widgets that need layout animations.
- Infinite CSS animations (edge dashes) **pause off-screen**: a `useInView` hook toggles `.is-paused { animation-play-state: paused }`.
- Long pages use `content-visibility: auto` on sections, and widgets mount when near the viewport (`next/dynamic` + an in-view gate).

**Accessibility**

- Skip link, landmarks and the source's visible focus rings.
- `prefers-reduced-motion` is honoured everywhere (02 §8).
- Node kinds and statuses are never conveyed by color alone: each has an icon and a label, and the legend uses swatch plus text.
- Every diagram has `<title>`/`<desc>`, a caption live region and a "Text description" list. Every chart has a table view.
- Sliders are native `<input type=range>` elements with `aria-valuetext` (for example "Hit ratio 90 percent").
- axe runs on every route in CI.

## 11. Testing

| Layer | Tool | What |
|---|---|---|
| Snippets | Vitest | Every runnable `content/**/snippets/*.js` has a sibling test (base62 round trip, weighted RR sequence, LRU, CRDT merge, quorum, estimates, bulkhead…) |
| Pure logic | Vitest | Diagram layout and edge paths, `useScenario`, simulators in `src/lib/sim`, playground lint, grader, `simulate()` |
| Components | Vitest + Testing Library | ScenarioControls (Space, ←, →, Home), chart tooltip on focus, Quiz scoring, Typeahead combobox ARIA |
| Content integrity | Vitest | Registry ↔ folders match; every question MDX contains the required sections; every diagram edge and scenario step points at existing nodes and edges |
| E2E | Playwright | Navigation, ⌘K search, theme persistence, quiz → complete, playground drag/connect/share round trip, `emulateMedia({ reducedMotion: 'reduce' })` |
| Accessibility | `@axe-core/playwright` | Every route, both themes |
| Visual | Playwright `toHaveScreenshot` | Each diagram's first frame, light and dark |

```ts
// tests/content.test.ts
import { describe, it, expect } from 'vitest';
import { allSpecs } from '@content/specs';            // re-exports every diagrams.ts

describe('diagram specs', () => {
  for (const [name, spec] of Object.entries(allSpecs)) {
    it(`${name}: edges and scenarios reference real nodes`, () => {
      const ids = new Set(spec.nodes.map(n => n.id));
      for (const e of spec.edges) {
        expect(ids.has(e.from), `${name}: unknown node ${e.from}`).toBe(true);
        expect(ids.has(e.to), `${name}: unknown node ${e.to}`).toBe(true);
      }
      const edgeIds = new Set(spec.edges.map(e => `${e.from}>${e.to}`));
      for (const sc of spec.scenarios ?? [])
        for (const st of sc.steps) expect(edgeIds.has(st.edge), `${name}/${sc.id}: ${st.edge}`).toBe(true);
    });
  }
});
```

For component tests, set `MotionGlobalConfig.skipAnimations = true` in the Vitest setup file so Motion animations finish instantly and assertions stay deterministic.

## 12. CI/CD

The GitHub Actions workflow on each PR runs: `npm ci` → `tsc --noEmit` → `eslint .` → `vitest run` → `next build` → `playwright test` against `next start` → Lighthouse CI on `/`, `/learn/caching`, `/questions/chat` and `/playground`. Vercel preview deployments run per PR, and production deploys on merge to `main`.

## 13. Optional backend (after launch)

Only add this when you need cross-device sync or shared designs.

- **Auth.js** plus **Postgres** (Neon or Supabase): tables `users`, `progress`, `designs (id, owner, title, doc jsonb, visibility, updated_at)`.
- Route handlers: `POST /api/designs`, `GET /api/designs/:id`, all validated with the same zod schema as share links.
- Real-time collaborative playground: Yjs with a WebSocket provider (or a hosted equivalent). React Flow has collaboration examples to start from.
