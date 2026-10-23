import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "web-crawler-architecture",
  title: "Web crawler architecture",
  description:
    "A URL frontier hands out one ready URL at a time, never two to the same host at once. Fetchers check robots.txt and DNS caches, download the page and write it to object storage. A parser extracts links and a fingerprint; a Bloom filter drops URLs already seen, and only new ones go back to the prioritizer and the frontier.",
  nodes: [
    { id: "frontier", label: "URL frontier", kind: "queue", col: 0, row: 0, sub: "queue per host", note: "Per-host queues, split by priority, plus a heap of 'host X may be fetched again at time T'. Persisted, so a restart loses nothing." },
    { id: "fetchers", label: "Fetchers", kind: "worker", col: 1, row: 0, sub: "~200 in flight", note: "Async I/O workers. Each takes one ready URL, checks robots.txt, downloads the page with a timeout and reports back so the host's delay starts." },
    { id: "store", label: "HTML store", kind: "storage", col: 2, row: 0, sub: "by content hash", note: "Object storage. Pages are compressed and keyed by the hash of their content, so a duplicate body is stored once." },
    { id: "parser", label: "Parser", kind: "worker", col: 3, row: 0, sub: "links + text" },
    { id: "fp", label: "Content dedupe", kind: "cache", col: 4, row: 0, sub: "fingerprints", note: "Exact hash for byte-identical pages, simhash for near-duplicates. A page already seen is kept once and its links are not followed again." },
    { id: "prior", label: "Prioritizer", kind: "service", col: 0, row: 1, sub: "score + schedule" },
    { id: "seen", label: "Seen filter", kind: "cache", col: 3, row: 1, sub: "Bloom, ~6 GB", note: "A Bloom filter over every normalized URL ever queued: about 6 GB for 5 billion URLs at a 1% false-positive rate. A 'no' is always right; a 'yes' wrongly drops about 1 URL in 100." },
    { id: "seeds", label: "Seed URLs", kind: "external", col: 0, row: 2 },
    { id: "dns", label: "DNS + robots cache", kind: "cache", col: 1, row: 2, sub: "per host" },
    { id: "web", label: "The web", kind: "external", col: 2, row: 2, sub: "millions of hosts" },
  ],
  edges: [
    { from: "seeds", to: "prior", label: "start here" },
    { from: "prior", to: "frontier", label: "enqueue" },
    { from: "frontier", to: "fetchers", label: "next ready URL" },
    { from: "fetchers", to: "dns", label: "resolve, robots" },
    { from: "fetchers", to: "web", label: "GET" },
    { from: "fetchers", to: "store", label: "page" },
    { from: "store", to: "parser", label: "new page", style: "async" },
    { from: "parser", to: "fp", label: "fingerprint" },
    { from: "parser", to: "seen", label: "links" },
    { from: "seen", to: "prior", label: "unseen only" },
  ],
  scenarios: [
    {
      id: "one-page",
      name: "One page, end to end",
      steps: [
        { edge: "frontier>fetchers", caption: "The frontier hands a fetcher https://news.example/a. Its host has not been fetched for 10 seconds, so it is ready." },
        { edge: "fetchers>dns", caption: "The fetcher resolves news.example from its DNS cache and checks the cached robots.txt: /a is allowed." },
        { edge: "fetchers>web", caption: "GET /a with the crawler's user agent and a 10 second timeout." },
        { edge: "fetchers>web", reverse: true, tone: "ok", caption: "200 OK, 120 KB of HTML, in 400 ms." },
        { edge: "fetchers>store", caption: "The page is compressed and written to object storage under the hash of its content." },
        { edge: "store>parser", caption: "A parse job is queued. The fetcher is already free, and the host's 10 second wait starts now." },
        { edge: "parser>fp", caption: "The parser fingerprints the text. It has not been seen, so it is kept for the indexer.", mark: [{ node: "fp", state: "ok" }] },
        { edge: "parser>seen", caption: "It extracts 40 links and normalizes them. Each goes to the Bloom filter." },
        { edge: "seen>prior", tone: "ok", caption: "28 were queued before and are dropped. The 12 new ones go to the prioritizer, which scores them and sets their priority.", mark: [{ node: "fp", state: null }] },
        { edge: "prior>frontier", tone: "ok", caption: "The new URLs join their hosts' queues. The loop closes." },
      ],
    },
    {
      id: "politeness",
      name: "Politeness",
      steps: [
        { edge: "prior>frontier", caption: "big.example has 5,000 URLs queued. One host, one queue." },
        { edge: "frontier>fetchers", caption: "The first goes out. big.example now has a fetch in flight, so no other worker may take its URLs.", mark: [{ node: "frontier", state: "busy" }] },
        { edge: "fetchers>web", caption: "The fetch takes 300 ms. Crawl-delay is 10 seconds, so the host's next turn is 10 seconds away." },
        { edge: "frontier>fetchers", caption: "Meanwhile, 3,859 other hosts have URLs ready. The frontier serves one of them instead: the same worker stays busy, and big.example sees one request." },
        { edge: "fetchers>web", caption: "Spread over about 3,860 hosts at once, a 10 second gap still adds up to 386 pages a second." },
        { edge: "frontier>fetchers", tone: "miss", caption: "Ten seconds later big.example is ready again. If it answers 429 or 503, its delay doubles instead.", mark: [{ node: "frontier", state: null }] },
      ],
    },
    {
      id: "duplicate",
      name: "Duplicate page",
      steps: [
        { edge: "fetchers>store", caption: "A mirror site serves the same article under a different URL." },
        { edge: "store>parser", caption: "The mirror's page is parsed like any other." },
        { edge: "parser>fp", tone: "miss", caption: "Its fingerprint is 1 bit away from a page we already have. Near-duplicate: keep one copy, link the URLs together.", mark: [{ node: "fp", state: "miss" }] },
        { edge: "parser>seen", caption: "Its links are checked too, but they mostly point at pages we already queued." },
        { edge: "seen>prior", tone: "ok", caption: "Two links were new. Only those two go on.", mark: [{ node: "fp", state: null }] },
      ],
    },
    {
      id: "trap",
      name: "Spider trap",
      steps: [
        { edge: "frontier>fetchers", caption: "cal.example/2031/01 is a calendar. Every month has a 'next month' link, forever." },
        { edge: "fetchers>store", caption: "Each page is different on the surface, so no fingerprint matches." },
        { edge: "store>parser", caption: "The parser extracts one new link per page, month after month." },
        { edge: "parser>seen", tone: "error", caption: "Every URL is new to the Bloom filter. The trap works on any seen-URL check.", mark: [{ node: "seen", state: "busy" }] },
        { edge: "seen>prior", tone: "error", caption: "The prioritizer counts the host's queued URLs: it hit its budget of 10,000, so it stops accepting more from cal.example.", mark: [{ node: "seen", state: null }] },
        { edge: "prior>frontier", tone: "ok", caption: "The rest of the crawl carries on. A per-host budget and a depth limit turn an infinite trap into a bounded cost." },
      ],
    },
  ],
};

export const fetchSequence: SequenceSpec = {
  id: "web-crawler-fetch-sequence",
  title: "One fetch, three outcomes",
  description:
    "The worker asks the frontier for a ready URL, checks robots.txt, then fetches. A normal page is stored; an overloaded host makes the frontier slow down; a disallowed URL is dropped.",
  actors: [
    { id: "frontier", label: "Frontier", kind: "queue" },
    { id: "worker", label: "Fetcher", kind: "worker" },
    { id: "robots", label: "Robots cache", kind: "cache" },
    { id: "site", label: "The site", kind: "external" },
    { id: "store", label: "HTML store", kind: "storage" },
  ],
  items: [
    { from: "worker", to: "frontier", label: "next()" },
    { from: "frontier", to: "worker", label: "https://news.example/a", type: "reply" },
    { from: "worker", to: "robots", label: "allowed(/a)?" },
    {
      alt: [
        {
          when: "200 OK",
          items: [
            { from: "robots", to: "worker", label: "yes, Crawl-delay 10 s", type: "reply" },
            { from: "worker", to: "site", label: "GET /a" },
            { from: "site", to: "worker", label: "200 + HTML", type: "reply" },
            { from: "worker", to: "store", label: "put(page)" },
            { from: "worker", to: "frontier", label: "done(url, delay 10 s)", type: "async" },
            { note: "The host is out of the heap for 10 seconds", over: ["frontier", "worker"] },
          ],
        },
        {
          when: "429 or 503",
          items: [
            { from: "robots", to: "worker", label: "yes", type: "reply" },
            { from: "worker", to: "site", label: "GET /a" },
            { from: "site", to: "worker", label: "429, Retry-After: 60", type: "reply" },
            { from: "worker", to: "frontier", label: "done(url, delay 60 s, retry)", type: "async" },
            { note: "The URL stays queued; the whole host slows down, not just this URL", over: ["frontier", "worker"] },
          ],
        },
        {
          when: "disallowed",
          items: [
            { from: "robots", to: "worker", label: "no: /a is disallowed", type: "reply" },
            { from: "worker", to: "frontier", label: "done(url, dropped)", type: "async" },
            { note: "No request is sent to the site at all", over: ["worker", "site"] },
          ],
        },
      ],
    },
  ],
};
