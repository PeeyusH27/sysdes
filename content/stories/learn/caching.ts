import { cacheAside } from "../../learn/04-caching/diagrams";
import { getPrimer } from "../../primers";
import type { Story } from "../types";

// The cache primer's picture (users, app, fast copy, slow database) for the problem and the idea.
// The page's own cache-aside diagram supplies the write race and the stampede.
const cache = getPrimer("cache")!.flow;

export const story: Story | undefined = {
  learn: [
    {
      head: "What a cache is",
      body: "A cache is a small, fast copy of data that is slow to fetch. You keep the answers people ask for most close at hand, so you do not walk to the archive every time.",
      eg: "A notepad on your desk",
      example: "A librarian jots down the books people ask for most on a notepad by her desk. The next person asks, and she reads the notepad instead of walking to the stacks.",
      doodle: "cache",
    },
    {
      head: "Why it makes things fast",
      body: "Reading from memory takes about 1 ms. Asking the database takes about 50 ms. If the copy answers most questions, the average wait drops close to the fast number.",
      eg: "The caf\u00e9 regular",
      example: "A caf\u00e9 that knows your usual starts making it as you walk in. Nobody asks and nobody waits. Regulars get the fast path, and new faces order from scratch.",
    },
    {
      head: "Hit, miss and hit ratio",
      body: "A hit means the copy had the answer. A miss means it did not, so you ask the database and save the answer for next time. The share of hits is the hit ratio.",
      eg: "Opening a news site twice",
      example: "The first visit downloads the logo, a miss. The second reuses the saved copy, a hit, so the page appears faster. The more visits reuse copies, the higher the ratio.",
    },
    {
      head: "Copies go stale",
      body: "If the original changes, the copy is wrong until you update or remove it. A timer called a TTL throws old copies away after a set time, so mistakes do not live forever.",
      eg: "A shelf price label",
      example: "A shop changes a price in its system, but the paper label still shows the old one. A rule such as reprint every morning works like a TTL.",
    },
    {
      head: "What deserves a cache",
      body: "Cache what is read often and changes rarely, like a product page. Do not cache what must always be exact, like an account balance, or what is read only once.",
      eg: "The menu and the bill",
      example: "A restaurant prints the menu once and reuses it all day. It never reuses yesterday's bill, because that must be exact every single time.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "Every read visits the database",
      line: "A crowd asks for the same page. Each answer takes 50 ms and the line grows.",
      scene: { kind: "flow", spec: cache, scenario: "without" },
    },
    {
      tag: "sum",
      head: "Do the sum first",
      line: "A fast copy answers most reads, so the database sees a fraction.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Reads a second", value: "4,000" },
          { label: "Found in cache", value: "90%" },
        ],
        result: { label: "Reach the database", value: "400/s" },
        verdict: { text: "Database load cut 10 times", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Check the fast copy first",
      line: "A hit answers in about 1 ms. Only a miss visits the 50 ms database.",
      scene: { kind: "flow", spec: cache, scenario: "with" },
    },
    {
      tag: "sum",
      head: "Hit ratio is the whole game",
      line: "Database reads a second, with 4,000 reads arriving.",
      scene: {
        kind: "bars",
        bars: [
          { label: "50% hit ratio", value: 2000, shown: "2,000/s", tone: "bad" },
          { label: "90% hit ratio", value: 400, shown: "400/s", tone: "warn" },
          { label: "99% hit ratio", value: 40, shown: "40/s", tone: "good" },
        ],
      },
      predict: { q: "Hit ratio goes from 90% to 99%. What happens to database load?", options: ["Halves", "Falls 10 times"], answer: 1, why: "Misses drop from 10% to 1%, so database reads fall from 400 to 40 a second." },
    },
    {
      tag: "choose",
      head: "What deserves a cache",
      line: "Read often, change rarely, and name the key fully.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Product pages", tone: "good", why: "Read often, rarely changed" },
          { label: "Feature flags", tone: "good", why: "Tiny and hot: keep in process" },
          { label: "Write-heavy keys", tone: "bad", why: "Hit ratio collapses; cache the count" },
          { label: "Per-user in CDN", tone: "bad", why: "A shared cache shows it to others" },
          { label: "No expiry set", tone: "bad", why: "Stale values live forever" },
        ],
      },
    },
    {
      tag: "catch",
      head: "Delete on write still races",
      line: "A slow reader can put the old value back after the delete.",
      scene: { kind: "flow", spec: cacheAside, scenario: "write-race" },
      predict: { q: "The writer deletes the key. Can the cache still go stale?", options: ["No, it was deleted", "Yes, a slow reader refills it"], answer: 1, why: "The reader loaded the old row first, then sets it after the delete. A short TTL limits the damage." },
    },
    {
      tag: "catch",
      head: "A hot key expires at 9:00",
      line: "5,000 requests miss together. One request rebuilds under a lock, the rest wait.",
      scene: { kind: "flow", spec: cacheAside, scenario: "stampede" },
    },
    {
      tag: "skip",
      head: "When a cache does not pay",
      line: "A cache is a copy, and copies go stale.",
      scene: {
        kind: "versus",
        left: { title: "Skip it when", points: ["The page is already fast", "The database sees 100 reads/s", "Data is write-heavy or per-user"] },
        right: { title: "Cache when", points: ["The same read repeats", "The answer rarely changes", "Hit ratio can pass 90%"] },
      },
    },
  ],
};
