# Authoring page extras and doodles

Detail pages are long: 1,000 to 2,000 words, 12 sections, 11 to 31 screens of scrolling. Three things make them easy to take in, and this file covers the content side of each.

1. **Core and detail.** Each page has a short spine (the *core*) that opens by default, and everything else folds away (the *detail*), one click from "Show everything".
2. **Say it.** A card with the 30-second version you would say in an interview.
3. **Explain it back** (questions only). Prompts for a guided five-step answer you write or say, checked against a list.

And the **doodles**: small hand-drawn pictures that give an idea something to look at before the words.

Read `docs/AUTHORING.md` first for the site's voice: short, vivid, correct, no em dashes as glue, no exclamation marks in prose, no emojis.

## Page extras

Files: `content/extras/{learn,deep-dives,questions,patterns,lld}.ts`, each `export const extras: Record<slug, PageExtras> = { ... }`, keyed by the page's registry slug (`content/registry.ts`, `content/dsa/registry.ts`, `content/lld/registry.ts`). The type is in `content/extras/types.ts`. Run the checks with

```bash
npx vitest run tests/extras.test.ts -t "extras: questions"      # or learn, deep-dives, patterns, lld
npx tsc --noEmit
```

**Read every page you write about, in full, before writing.** Everything in `sayIt` and `explain` must agree with the page: same numbers, same trade-offs, same terms. If a number is not on the page, do not invent it; use one that is, or one you can show is true (and then do not contradict the page).

### `detail`: what folds away

A list of section ids: the slug of each `##` heading, lowercased, punctuation removed, spaces to hyphens (`## Capacity estimate` is `capacity-estimate`; `## Park and exit, step by step` is `park-and-exit-step-by-step`). The test checks that every id is a real `##` heading on the page.

Choose so the **core is 3 to 7 sections, ideally 5**, a spine someone can finish in about five minutes:

- Keep in the core: the section that states the central idea; the main diagram or interactive; the key decision and its trade-offs; the section where the learner practises (the follow-ups and the quiz are always at the end, keep them in the core so the page still ends with a check).
- Fold into the detail: capacity and estimation tables, data-model SQL, extra code walkthroughs, persistence, long failure-mode tables, "step-by-step answer" prose that repeats the diagram, comparison tables of more than 4 columns, reference material.
- A section that is the only place a key idea appears stays in the core. When two sections say the same thing, keep the more visual one.
- For question pages, the usual core is: clarifying questions (short, it is the first thing said), the architecture or class design (the stage/animation), watch it run (the interactive), trade-offs, follow-ups. Do not hide the interactive widget.

### `sayIt`: the 30-second version

- `answer`: what you would actually say if the interviewer asked "so, how would you do this?" and you had thirty seconds. Two or three sentences, first person ("I'd..."), at most 70 words, concrete nouns, the design and the reason for it. For a lesson or deep dive, say the idea and when you reach for it. For a DSA pattern, say how to recognise it and what it costs ("When a problem asks for a pair or a complement in unsorted data, I reach for a hash map: one pass, O(n) time, O(n) space, instead of a nested loop.").
- `numbers`: exactly three, each `{ value, label }`. `value` is at most 18 characters ("~1.2 MB/day", "O(n)", "5 min TTL"). `label` is at most 9 words and says what it is. Choose the numbers an interviewer would be glad you knew.
- `tradeoffs`: exactly three, each at most 25 words, in the form "A vs B: ..." naming what you give up and what you get. Take them from the page's trade-off tables where it has them.
- `mention`: the one failure or edge case to bring up before they ask. One sentence, one line. This is what separates a prepared answer from a memorised one.

### `explain` (questions only): explain it back

Five steps in this exact order: `clarify`, `estimate`, `interface`, `design`, `deepdive`. For each, `prompt` is what to do, specific to this question, at most 25 words, imperative ("List the three questions you would ask before drawing anything."), and `hint` is a one-sentence nudge taken from the page. For low-level design questions `estimate` means "size the problem": how big is it, does a scan matter; `interface` means the public methods; `design` means the classes and what each owns.

`checklist`: 6 to 8 observable things a strong answer includes, each at most 14 words and phrased so someone can check it off ("Names the double-booking race and where it is prevented"). Base it on the page's "What interviewers listen for" callout, its trade-offs and its follow-ups.

### `doodle` (optional)

The picture shown at the top of the page: one name from `src/components/doodle/names.ts` that fits the page's main idea. Leave it out when none fits.

## Doodles

A doodle is a function in `src/components/doodle/art/*.tsx` returning SVG children for a **200 × 150** canvas. The wrapper (`Doodle.tsx`) adds the `<svg>`, so return only shapes. The goal: a small drawing that explains an idea through a *familiar physical analogy*, looking like someone drew it with a marker.

**Look at `art/system-a.tsx` first: the `cache` doodle is the reference.** Its recipe:

1. A wash first: `d-fill` (accent tint) or `d-warm` (warm tint) shapes under the main drawing, drawn as plain `M x y h w v h z` paths, deliberately a few pixels off from the outline so it looks coloured in.
2. The outline with `d-line` (the pen), using only the helpers in `hand.ts`: `rect`, `box` (rounded), `circle`, `ellipse`, `line`, `poly`, `arrow`, `squiggle`, `hatch`. Never use raw `<rect>`, `<circle>` or `<line>` elements: they look machine-made, and the test rejects them.
3. One hot spot in the warm colour (`d-hot` strokes, `d-warm` fills) on the thing the idea is *about*, so the eye lands there.
4. Details in `d-thin`. Handwriting (`d-text`) for at most three short words (14 characters each), at font sizes 11 to 16.
5. Give every helper call a different `seed` argument (the last or near-last parameter), so repeated strokes do not wobble identically.

Rules, enforced by `tests/doodle.test.ts`: only the classes `d-line d-thin d-fill d-warm d-accent d-hot d-text`; no inline `style`, no hex colours (colours come from the site's tokens, so doodles follow light and dark mode); 8 to 90 `<path>` elements; at most 3 `<text>`; coordinates stay on the 200 × 150 canvas (leave a 10 px margin); `title` is one sentence of 25 to 140 characters that says what the picture shows and how it maps to the idea, ending with punctuation (it is the caption and the screen-reader label).

Composition: one clear subject, centred, roughly filling 140 × 110 of the canvas, with a little empty space around it; at most one supporting object; a simple scene beats a detailed one. People are stick figures (a circle head with `hand.circle`, a few `line`s), at most 3 per drawing. Think "whiteboard sketch a friendly senior engineer draws while explaining", not clip art.

### Reviewing your own work (do this, it is the point)

You must look at every doodle you draw. No site build is needed, and **do not run `next build` or `next dev`** (others are building):

```bash
S=/private/tmp/claude-501/-Users-riturajanand-Desktop-sysdes/188e0425-420d-4701-8fe1-74401d0413a6/scratchpad/doodle-review/<your-name>   # any empty directory
mkdir -p $S
DOODLE_SHEET=$S/sheet.html DOODLES=load-balancer,queue npx vitest run tests/doodle-sheet.test.ts
node scripts/shot-html.mjs $S/sheet.html $S/sheet.png 900
```

Then open the PNG with the Read tool and **look at it**. Ask: can a stranger say what it is in two seconds? Is the analogy right? Are shapes overlapping into a muddle? Is the hot spot on the right thing? Does handwriting collide with a line? Fix and re-render until each one reads clearly. Also render with `DOODLE_THEME=dark` once to check it stays readable. Then run `npx vitest run tests/doodle.test.ts -t <name>` for each name you drew, and `npx tsc --noEmit`.
