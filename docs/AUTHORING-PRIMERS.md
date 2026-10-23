# Authoring primers: "What is X?" in a minute

A primer is for the person who just landed on "Caching Techniques" or "Sharding Strategies" and was never told what caching or sharding *is*. It is one animated scene, one picture from everyday life, three things to remember, and a way to go deeper. Someone who reads only this should be able to explain the idea to a friend.

Files: `content/primers/<id>.ts`, one per id in `content/primers/types.ts` (`PRIMER_IDS`). Each exports `export const primer: Primer = { ... }`. The type and every limit are in `types.ts`; `tests/primers.test.ts` enforces them:

```bash
npx vitest run tests/primers.test.ts -t "<id>"
npx tsc --noEmit
```

Do not run `next build` or `next dev`.

## The reader

Smart, has built an app, has never studied distributed systems (or forgot). Does not know the word. **Do not use the term in the idea sentence before saying what it is.** Prefer the everyday word ("a copy", "a line", "a split") and introduce the real term once, in the `title` and the first caption that needs it.

## The pieces

- **`idea`**: the whole thing in one sentence, 22 words at most, no jargon. Test: could you say it to a 12-year-old? "A cache is a small, fast place that keeps the answers you ask for most, so you stop going to the slow place."
- **`doodle` and `analogy`**: pick the doodle that already pictures it (see `src/components/doodle/names.ts`; `connection-pool` and `sql-nosql` are being drawn now, use them for those two primers) and write one sentence connecting the picture to the idea, 28 words at most. The analogy is what people remember: make it physical and specific.
- **`flow`**: a `FlowSpec` (read `src/components/diagram/types.ts` and a finished example, `content/learn/04-caching/diagrams.ts`, and `src/components/diagram/kinds.ts` for node kinds). Rules for primers:
  - At most **7 nodes**, labels at most 16 characters, **plain labels** ("Your app", "Fast copy", "Slow database", not "Redis cluster"). Node `kind` picks the icon, so use the kind that fits and a friendly label.
  - Scenarios, in this order: **`Without ...`** (the problem: show *what hurts*: use `mark` with `busy`, `down` or `miss`, and `tone: "error"` or `"miss"` so the pain is visible), then **`With ...`** (the idea working: `tone: "ok"`, `hit`), then optionally a third **"When it ..."** for the one catch worth seeing. Name them "Without a cache", "With a cache", "When the copy is old". The first two names must start with "Without" and "With".
  - 3 to 8 steps per scenario. **Every caption is one short sentence in plain words, at most 16 words**, narrating what is happening to a request, in the present tense: "The app asks the slow database. It takes 50 ms." Use real, small numbers where they make it vivid.
  - Use `reverse: true` for replies, `with: [...]` to show many requests at once (a crowd hurting a single server is the clearest picture of load).
  - Lay nodes out left to right in a clean line or a Y; keep rows 0 to 2.
- **`remember`**: exactly three, each at most 12 words, each a complete thought a person could repeat: "It trades freshness for speed." Not "Speed".
- **`whenToUse`** and **`theCatch`**: one sentence each, 22 words at most. The catch is the honest cost: this is what interviewers ask next.
- **`say`**: what to say in an interview, first person, 30 words at most.
- **`learnMore`**: 1 to 3 existing pages (check `content/registry.ts` for slugs: `/learn/...`, `/deep-dives/...`, `/questions/...`).

## Style

No em dashes as glue, no exclamation marks, no emojis. Short, concrete, correct. Every number and claim must be true: simplifying is not the same as being wrong. If a simple sentence would be false, use a slightly longer true one.

## Check by looking

You cannot run the site, but you can read `FlowSpec` data critically: would a newcomer following only the captions, step by step, understand why the problem hurts and how the fix helps? Read your three scenarios aloud as one story. Cut any caption that does not move the story.
