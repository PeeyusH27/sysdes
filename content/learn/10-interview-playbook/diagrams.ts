import type { DecisionSpec, FlowSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const interviewPlan: TimelineSpec = {
  id: "interview-plan",
  title: "The 45-minute plan",
  description:
    "5 minutes of requirements, 5 of estimation and API, 15 of high-level design, 15 of deep dives (two areas), and 5 to wrap up with trade-offs. Each marker is a checkpoint: if you're behind, say so and move on.",
  unit: "min",
  lanes: [
    { id: "req", label: "Requirements" },
    { id: "est", label: "Estimation + API" },
    { id: "hld", label: "High-level design" },
    { id: "deep", label: "Deep dives" },
    { id: "wrap", label: "Wrap-up" },
  ],
  spans: [
    { lane: "req", start: 0, end: 5, label: "Scope", tone: 1 },
    { lane: "est", start: 5, end: 10, label: "QPS, API", tone: 2 },
    { lane: "hld", start: 10, end: 25, label: "Components + data flow", tone: 1 },
    { lane: "deep", start: 25, end: 33, label: "Deep dive 1", tone: 2 },
    { lane: "deep", start: 33, end: 40, label: "Deep dive 2", tone: 3 },
    { lane: "wrap", start: 40, end: 45, label: "Summary", tone: 1 },
  ],
  markers: [
    { at: 5, label: "Scope" },
    { at: 10, label: "API" },
    { at: 25, label: "Design" },
    { at: 40, label: "Wrap" },
  ],
};

export const interviewFramework: FlowSpec = {
  id: "interview-framework",
  title: "The framework",
  description:
    "Requirements, estimation, API and data model, high-level design, deep dives, then trade-offs and a summary. Each stage produces something you write on the board and build on in the next.",
  nodes: [
    { id: "req", label: "Requirements", kind: "dns", col: 0, row: 1, sub: "~5 min", note: "Functional, non-functional with numbers, out of scope." },
    { id: "est", label: "Estimation", kind: "idgen", col: 1, row: 1, sub: "~3 min", note: "QPS (average and peak), storage, read:write ratio, and what they imply." },
    { id: "api", label: "API", kind: "gateway", col: 2, row: 0, sub: "~2 min", note: "The 3–5 endpoints that matter, with status codes." },
    { id: "data", label: "Data model", kind: "database", col: 2, row: 2, sub: "with the design", note: "Tables or keys, and the access pattern that picks the store." },
    { id: "hld", label: "High-level design", kind: "service", col: 3, row: 1, sub: "~15 min", note: "Boxes and labelled arrows, with the request flow numbered." },
    { id: "deep", label: "Deep dives", kind: "search", col: 4, row: 1, sub: "~15 min", note: "Two of the riskiest areas, including failure modes." },
    { id: "wrap", label: "Trade-offs + wrap", kind: "lb", col: 5, row: 1, sub: "~5 min", note: "What you chose, what it cost, when you'd switch, and a short summary." },
  ],
  edges: [
    { from: "req", to: "est", label: "scope agreed" },
    { from: "est", to: "api", label: "numbers" },
    { from: "api", to: "data" },
    { from: "data", to: "hld" },
    { from: "hld", to: "deep", label: "works end to end" },
    { from: "deep", to: "wrap", label: "risks covered" },
  ],
  scenarios: [
    {
      id: "walkthrough",
      name: "45-minute walkthrough",
      steps: [
        {
          edge: "req>est",
          caption: "Minutes 0–5: ask questions and write the requirements down. For a URL shortener: shorten, redirect, expiry, analytics; redirects under 20 ms and 99.99% available.",
          mark: [{ node: "req", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "est>api",
          caption: "Minutes 5–8: numbers, and what they mean. 100M links a month is 40 writes/s; at 100:1 that's 4,000 redirects/s. Read-heavy, so caching will matter.",
          mark: [{ node: "est", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "api>data",
          caption: "Minutes 8–10: the API (POST /api/urls, GET /:code), then the key table: code → long URL, looked up by primary key.",
          mark: [{ node: "api", state: "ok" }],
          ms: 2000,
        },
        {
          edge: "data>hld",
          caption: "Minutes 10–25: boxes and arrows. Number the request flow and walk one create and one redirect end to end.",
          mark: [{ node: "data", state: "ok" }, { node: "hld", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "hld>deep",
          caption: "Minutes 25–40: go deep on the two riskiest parts (code generation, the hot read path), including what happens when something fails.",
          mark: [{ node: "hld", state: "ok" }, { node: "deep", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "deep>wrap",
          tone: "ok",
          caption: "Minutes 40–45: the trade-offs you made, the next bottleneck, what you'd do with more time, and a 30-second summary.",
          mark: [{ node: "deep", state: "ok" }, { node: "wrap", state: "ok" }],
          ms: 2200,
        },
      ],
    },
    {
      id: "unstuck",
      name: "Getting unstuck",
      steps: [
        {
          edge: "hld>deep",
          caption: "Mid deep dive, the interviewer asks what happens at 10× the traffic, and you're not sure where to start.",
          mark: [{ node: "deep", state: "busy" }],
        },
        {
          edge: "req>est",
          reverse: true,
          tone: "miss",
          caption: "Don't guess a technology. Go back to the requirements and numbers out loud: 10× is 40K redirects/s, and redirects must still take under 20 ms.",
          mark: [{ node: "req", state: "busy" }],
          ms: 2000,
        },
        {
          edge: "req>est",
          caption: "Simplify, then ask what breaks first. At a 95% hit ratio the database now sees 2,000 reads/s instead of 200.",
          mark: [{ node: "req", state: null }],
          ms: 2000,
        },
        {
          edge: "data>hld",
          caption: "Scale step by step and say why at each step: a bigger cache, read replicas, then sharding by code.",
          ms: 2000,
        },
        {
          edge: "hld>deep",
          tone: "ok",
          caption: "Back in the deep dive with a reasoned answer. Interviewers score the reasoning, not instant recall.",
          mark: [{ node: "deep", state: "ok" }],
          ms: 2000,
        },
      ],
    },
  ],
};

/* ---------- phase pictures ---------- */

export const scopingDialog: SequenceSpec = {
  id: "scoping-dialog",
  title: "The first five minutes",
  description: "Two ways to open the same prompt: start drawing, or ask four questions and write the answers down.",
  actors: [
    { id: "you", label: "You", kind: "client" },
    { id: "iv", label: "Interviewer", kind: "external" },
    { id: "board", label: "Board", kind: "service" },
  ],
  items: [
    { from: "iv", to: "you", label: "Design a URL shortener", type: "call" },
    {
      alt: [
        {
          when: "Weak: draw first",
          items: [
            { from: "you", to: "iv", label: "Okay. Load balancer, then Cassandra...", type: "call" },
            { note: "No scope, no numbers, and a tool named in minute 1", over: ["you", "iv", "board"] },
            { from: "iv", to: "you", label: "Why Cassandra?", type: "reply" },
          ],
        },
        {
          when: "Strong: ask first",
          items: [
            { from: "you", to: "iv", label: "Who clicks, and how many links a month?", type: "call" },
            { from: "iv", to: "you", label: "100M links a month, mostly reads", type: "reply" },
            { from: "you", to: "iv", label: "Core: shorten and redirect. Is analytics in scope?", type: "call" },
            { from: "iv", to: "you", label: "Leave analytics out", type: "reply" },
            { from: "you", to: "iv", label: "Redirects under 20 ms, 99.99% up. Agreed?", type: "call" },
            { note: "Four lines on the board: users, features, targets, out of scope", over: ["you", "iv", "board"] },
          ],
        },
      ],
    },
  ],
};

export const estimationChain: FlowSpec = {
  id: "estimation-chain",
  title: "From a prompt to a design decision",
  description: "Each number leads to the next, and the last one says what to build. 100M links a month becomes 40 writes a second, 4,000 reads a second, and a cache in front of one database.",
  nodes: [
    { id: "prompt", label: "Prompt", kind: "client", col: 0, row: 1, sub: "100M links/mo", note: "The scale the interviewer gave you, or the one you assumed and said aloud." },
    { id: "writes", label: "Writes", kind: "idgen", col: 1, row: 1, sub: "~40 per sec", note: "100M divided by about 2.6M seconds in a month." },
    { id: "reads", label: "Reads", kind: "cache", col: 2, row: 1, sub: "~4,000 per sec", note: "100 redirects for every link created." },
    { id: "store", label: "Storage", kind: "storage", col: 2, row: 0, sub: "~3 TB", note: "6 billion rows of about 500 bytes over 5 years." },
    { id: "design", label: "Implication", kind: "service", col: 3, row: 1, sub: "cache + 1 DB", note: "The sentence that turns numbers into a choice." },
  ],
  edges: [
    { from: "prompt", to: "writes", label: "÷ secs" },
    { from: "writes", to: "reads", label: "× 100" },
    { from: "writes", to: "store", label: "× bytes" },
    { from: "reads", to: "design", label: "so" },
  ],
  scenarios: [
    {
      id: "traffic",
      name: "Traffic",
      steps: [
        { edge: "prompt>writes", caption: "A month is about 2.6M seconds (30 days times 86,400). 100M links a month divided by 2.6M is about 40 writes a second.", mark: [{ node: "writes", state: "ok" }], ms: 2200 },
        { edge: "writes>reads", caption: "At 100 redirects per link that is about 4,000 reads a second on average. Peak is 2 to 5 times that, so plan for roughly 12,000.", mark: [{ node: "reads", state: "ok" }], ms: 2200 },
        { edge: "reads>design", tone: "ok", caption: "Say what it means: read-heavy and small, so a cache in front of one database is enough. No sharding yet.", mark: [{ node: "design", state: "ok" }], ms: 2200 },
      ],
    },
    {
      id: "storage",
      name: "Storage",
      steps: [
        { edge: "writes>store", caption: "40 writes a second at about 500 bytes each is 20 KB a second, or about 1.7 GB a day.", mark: [{ node: "writes", state: "ok" }], ms: 2200 },
        { edge: "writes>store", caption: "Five years is 100M a month times 60 months: 6 billion rows, about 3 TB. With 3 replicas, about 9 TB.", mark: [{ node: "store", state: "ok" }], ms: 2200 },
        { edge: "reads>design", tone: "ok", caption: "3 TB fits on one large disk. Storage alone does not force sharding here. Say so.", mark: [{ node: "design", state: "ok" }], ms: 2200 },
      ],
    },
    {
      id: "weak-strong",
      name: "Weak vs strong",
      steps: [
        { edge: "writes>reads", tone: "miss", caption: "Weak: it is 4,000 per second. Full stop. The number sits on the board and changes nothing.", mark: [{ node: "reads", state: "miss" }], ms: 2200 },
        { edge: "reads>design", tone: "ok", caption: "Strong: 4,000 per second, 100 to 1 reads to writes, so I would cache and keep one database. The number now picked a design.", mark: [{ node: "reads", state: "ok" }, { node: "design", state: "ok" }], ms: 2400 },
      ],
    },
  ],
};

export const requestFlow: SequenceSpec = {
  id: "request-flow",
  title: "A numbered request flow",
  description: "Walk one create and one redirect with numbered steps, so the interviewer can say stop at step 4.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "gw", label: "Gateway", kind: "gateway" },
    { id: "svc", label: "Shortener", kind: "service" },
    { id: "cache", label: "Redis", kind: "cache" },
    { id: "db", label: "Postgres", kind: "database" },
  ],
  items: [
    {
      alt: [
        {
          when: "Create a link",
          items: [
            { from: "client", to: "gw", label: "1 POST /api/urls" },
            { from: "gw", to: "svc", label: "2 auth + rate limit" },
            { from: "svc", to: "db", label: "3 insert code, long URL" },
            { from: "svc", to: "client", label: "4 201 with short URL", type: "reply" },
          ],
        },
        {
          when: "Redirect",
          items: [
            { from: "client", to: "gw", label: "1 GET /abc123" },
            { from: "gw", to: "svc", label: "2 forward" },
            { from: "svc", to: "cache", label: "3 get code" },
            { from: "svc", to: "db", label: "4 on miss: read, then cache" },
            { from: "svc", to: "client", label: "5 302 Location: long URL", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const deepDivePicker: DecisionSpec = {
  id: "deep-dive-picker",
  title: "Which two areas get a deep dive?",
  start: "lead",
  nodes: {
    lead: { q: "Has the interviewer already pointed at an area?", yes: "follow", no: "hot" },
    follow: { result: "Take their area first", why: "It is what they want to score. Still choose the second one yourself, from the questions below." },
    hot: { q: "Does one path carry most of the traffic?", yes: "hotpath", no: "once" },
    hotpath: { result: "Dive into the hot path", why: "At 4,000 redirects a second the read path sets latency. Cover cache, replicas, and what happens when the cache is down." },
    once: { q: "Must a step never lose or repeat work?", yes: "correct", no: "hard" },
    correct: { result: "Dive into the correctness path", why: "Payments, ids and ordering are scored on what happens during a retry or a crash. Cover idempotency and failure." },
    hard: { result: "Dive into the hardest-to-change data", why: "A shard key or id scheme is painful to change later. Cover the options, pick one, and name its cost." },
  },
};

export const wrapUp: TimelineSpec = {
  id: "wrap-up",
  title: "The last five minutes",
  description: "Two minutes of trade-offs, two on the next bottleneck, one for a 30-second summary.",
  unit: "min",
  lanes: [
    { id: "choices", label: "Trade-offs" },
    { id: "risk", label: "Next bottleneck" },
    { id: "sum", label: "Summary" },
  ],
  spans: [
    { lane: "choices", start: 40, end: 42, label: "2 choices, their cost", tone: 1 },
    { lane: "risk", start: 42, end: 44, label: "What breaks next", tone: 2 },
    { lane: "sum", start: 44, end: 45, label: "30 seconds", tone: 3 },
  ],
  markers: [
    { at: 40, label: "Wrap" },
    { at: 45, label: "Done" },
  ],
};

/* ---------- frameworks and numbers ---------- */

export const radioFlow: FlowSpec = {
  id: "radio-flow",
  title: "RADIO on a typeahead",
  description: "Five stages for a frontend round, shown on an autocomplete box.",
  nodes: [
    { id: "r", label: "Requirements", kind: "dns", col: 0, row: 1, note: "Features, devices, offline, speed targets." },
    { id: "a", label: "Architecture", kind: "service", col: 1, row: 1, note: "Component tree and where state lives." },
    { id: "d", label: "Data model", kind: "database", col: 2, row: 1, note: "Client state shape and what is cached." },
    { id: "i", label: "Interface", kind: "gateway", col: 3, row: 1, note: "Props, events and endpoints." },
    { id: "o", label: "Optimizations", kind: "cdn", col: 4, row: 1, note: "Virtualisation, splitting, accessibility." },
  ],
  edges: [
    { from: "r", to: "a", label: "scope" },
    { from: "a", to: "d", label: "state" },
    { from: "d", to: "i", label: "shape" },
    { from: "i", to: "o", label: "works" },
  ],
  scenarios: [
    {
      id: "typeahead",
      name: "Typeahead",
      steps: [
        { edge: "r>a", caption: "Requirements: suggestions appear within 100 ms of a keystroke, work on mobile, and a keyboard user can pick one.", mark: [{ node: "r", state: "ok" }], ms: 2000 },
        { edge: "a>d", caption: "Architecture: an input, a suggestion list and a hook that owns the query. Only the hook knows about the network.", mark: [{ node: "a", state: "ok" }], ms: 2000 },
        { edge: "d>i", caption: "Data model: the query string, a list of results, a loading flag, and a cache keyed by the prefix.", mark: [{ node: "d", state: "ok" }], ms: 2000 },
        { edge: "i>o", caption: "Interface: props for onSelect and fetcher, and GET /suggest with a prefix and a limit.", mark: [{ node: "i", state: "ok" }], ms: 2000 },
        { edge: "i>o", tone: "ok", caption: "Optimizations: debounce 150 ms, cancel stale requests, cache by prefix, and ARIA roles for the list.", mark: [{ node: "o", state: "ok" }], ms: 2200 },
      ],
    },
  ],
};

export const scaleLadder: FlowSpec = {
  id: "scale-ladder",
  title: "Let the numbers pick the stopping point",
  description: "The same URL shortener at three loads: one database is enough at 40 writes a second, a cache at 4,000 reads a second, and shards only at 40,000 writes a second.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 2, row: 0, sub: "added at 4K reads" },
    { id: "db", label: "One Postgres", kind: "database", col: 2, row: 1, sub: "start here" },
    { id: "shards", label: "Shards", kind: "database", col: 2, row: 2, sub: "×4 by hash", note: "Only when one primary cannot take the writes." },
  ],
  edges: [
    { from: "client", to: "app" },
    { from: "app", to: "cache", label: "read" },
    { from: "app", to: "db", label: "write" },
    { from: "app", to: "shards", label: "write" },
  ],
  scenarios: [
    {
      id: "small",
      name: "40 writes/s",
      steps: [
        { edge: "client>app", caption: "40 writes a second. One Postgres handles thousands of simple writes a second, so this is far below its limit.", ms: 1800 },
        { edge: "app>db", tone: "ok", caption: "Say it: one database is enough. I will skip sharding and add it only if the numbers change.", mark: [{ node: "db", state: "ok" }], ms: 2200 },
      ],
    },
    {
      id: "reads",
      name: "4,000 reads/s",
      steps: [
        { edge: "client>app", caption: "Reads grow to 4,000 a second, 100 times the writes. The database could serve them, but at a cost in latency and headroom.", ms: 2000 },
        { edge: "app>cache", caption: "Add Redis. At a 95% hit ratio the database sees 5% of 4,000, about 200 reads a second.", mark: [{ node: "cache", state: "hit" }], ms: 2200 },
        { edge: "app>db", tone: "ok", caption: "One database still holds all the data. The cache removed the read pressure, not the need for a database.", mark: [{ node: "db", state: "ok" }], ms: 2200 },
      ],
    },
    {
      id: "large",
      name: "40,000 writes/s",
      steps: [
        { edge: "client>app", caption: "Writes are now 40,000 a second, 1,000 times more. A single primary is past what it can take.", mark: [{ node: "db", state: "busy" }], ms: 2000 },
        { edge: "app>shards", caption: "Now say: I would shard by a hash of the code. Four shards bring each one to about 10,000 writes a second.", mark: [{ node: "db", state: "down" }, { node: "shards", state: "ok" }], ms: 2400 },
        { edge: "app>shards", tone: "ok", caption: "Name the cost: no cross-shard joins, and resharding later is work. That cost is why you did not do it at 40 writes a second.", ms: 2400 },
      ],
    },
  ],
};

/* ---------- worked weak vs strong ---------- */

export const pushbackDialog: SequenceSpec = {
  id: "pushback-dialog",
  title: "Pushback on your database choice",
  description: "The interviewer questions a choice. Three replies: defend blindly, give in, or restate the concern and weigh it against your numbers.",
  actors: [
    { id: "you", label: "You", kind: "client" },
    { id: "iv", label: "Interviewer", kind: "external" },
    { id: "board", label: "Board", kind: "service" },
  ],
  items: [
    { from: "iv", to: "you", label: "Would DynamoDB be better than Postgres here?", type: "call" },
    {
      alt: [
        {
          when: "Weak: dig in",
          items: [
            { from: "you", to: "iv", label: "No. Postgres is fine.", type: "reply" },
            { note: "A claim with no reason. It sounds defensive", over: ["you", "iv", "board"] },
          ],
        },
        {
          when: "Weak: give in",
          items: [
            { from: "you", to: "iv", label: "Oh, yes, let me switch to DynamoDB.", type: "reply" },
            { note: "No reasoning, so the first choice looks like a guess", over: ["you", "iv", "board"] },
          ],
        },
        {
          when: "Strong: weigh it",
          items: [
            { from: "you", to: "iv", label: "You are pointing at write scale, right?", type: "reply" },
            { from: "you", to: "iv", label: "At 40 writes/s Postgres is plenty, and I get joins.", type: "reply" },
            { from: "you", to: "iv", label: "At 40K writes/s with key lookups only, I would move.", type: "reply" },
            { note: "Concern restated, tied to a number, with a switch point", over: ["you", "iv", "board"] },
          ],
        },
      ],
    },
  ],
};

export const failureQuestion: SequenceSpec = {
  id: "failure-question",
  title: "What if Redis goes down?",
  description: "A failure question has three parts: what breaks, how you notice, and what the user sees meanwhile.",
  actors: [
    { id: "you", label: "You", kind: "client" },
    { id: "iv", label: "Interviewer", kind: "external" },
    { id: "board", label: "Board", kind: "service" },
  ],
  items: [
    { from: "iv", to: "you", label: "What if Redis goes down?", type: "call" },
    {
      alt: [
        {
          when: "Weak: deflect",
          items: [
            { from: "you", to: "iv", label: "Redis is very reliable, it should not.", type: "reply" },
            { note: "Dodges the question the round is built to ask", over: ["you", "iv", "board"] },
          ],
        },
        {
          when: "Strong: break it down",
          items: [
            { from: "you", to: "iv", label: "Cache-aside, so reads fall through to Postgres.", type: "reply" },
            { from: "you", to: "iv", label: "That is 4,000 reads/s instead of 200, 20 times more.", type: "reply" },
            { from: "you", to: "iv", label: "I would rate limit, and keep a 30 s in-process copy.", type: "reply" },
            { from: "you", to: "iv", label: "A health check alerts us in seconds.", type: "reply" },
            { note: "What breaks, the number, the mitigation, the detection", over: ["you", "iv", "board"] },
          ],
        },
      ],
    },
  ],
};

/* ---------- driving and getting unstuck ---------- */

export const driveConversation: SequenceSpec = {
  id: "drive-conversation",
  title: "Driving the conversation",
  description: "You hold the pen, so you set the agenda: say where you are, say what is next, and offer a choice at each fork.",
  actors: [
    { id: "you", label: "You", kind: "client" },
    { id: "iv", label: "Interviewer", kind: "external" },
    { id: "board", label: "Board", kind: "service" },
  ],
  items: [
    {
      alt: [
        {
          when: "Passive",
          items: [
            { from: "you", to: "iv", label: "(draws in silence for four minutes)", type: "call" },
            { from: "iv", to: "you", label: "So what are you building?", type: "reply" },
            { note: "The interviewer steers. You are now answering, not leading", over: ["you", "iv", "board"] },
          ],
        },
        {
          when: "Driving",
          items: [
            { from: "you", to: "iv", label: "Scope is agreed. Next I will size it, about 3 minutes.", type: "call" },
            { from: "you", to: "iv", label: "Peak is 12K reads/s, so read-heavy. Next, the API.", type: "call" },
            { from: "you", to: "iv", label: "The design works end to end. I see two risks.", type: "call" },
            { from: "you", to: "iv", label: "Code generation or the read path first?", type: "call" },
            { from: "iv", to: "you", label: "The read path.", type: "reply" },
          ],
        },
      ],
    },
  ],
};

export const stuckTree: DecisionSpec = {
  id: "stuck-tree",
  title: "You are stuck. What now?",
  start: "req",
  nodes: {
    req: { q: "Can you restate what the requirements say about this part?", yes: "num", no: "back" },
    back: { result: "Go back to requirements", why: "Say it aloud: Let me restate what we need here. Then ask one clarifying question. It buys time and often gives the answer." },
    num: { q: "Do you have a number for it?", yes: "simple", no: "estimate" },
    estimate: { result: "Estimate out loud", why: "Round hard and say the assumption: say 10% of users are active, so 10M. Being 2 times off is fine; skipping the number is not." },
    simple: { q: "Do you know a simple version that works?", yes: "scale", no: "gap" },
    scale: { result: "Build the simple one, then scale", why: "Draw it, ask what breaks first at 10 times the load, and fix one thing at a time, saying why at each step." },
    gap: { result: "Name the gap and reason", why: "Say: I do not know X in detail, but here is how I would think about it. Reasoning in the open scores; silence does not." },
  },
};

export const catchUp: TimelineSpec = {
  id: "catch-up",
  title: "Behind at minute 25",
  description: "The design should be done at minute 25. If you are still drawing, finish it fast, take one deep dive, and name the second in a sentence.",
  unit: "min",
  lanes: [
    { id: "plan", label: "On plan" },
    { id: "late", label: "Behind" },
  ],
  spans: [
    { lane: "plan", start: 0, end: 10, label: "Scope, numbers, API", tone: 1 },
    { lane: "plan", start: 10, end: 25, label: "Design", tone: 2 },
    { lane: "plan", start: 25, end: 40, label: "2 deep dives", tone: 3 },
    { lane: "plan", start: 40, end: 45, label: "Wrap", tone: 1 },
    { lane: "late", start: 0, end: 12, label: "Slow start", tone: 1 },
    { lane: "late", start: 12, end: 28, label: "Design", tone: 2 },
    { lane: "late", start: 28, end: 38, label: "1 deep dive", tone: 3 },
    { lane: "late", start: 38, end: 40, label: "Name no. 2", tone: 2 },
    { lane: "late", start: 40, end: 45, label: "Wrap", tone: 1 },
  ],
  markers: [
    { at: 25, label: "Design due" },
    { at: 40, label: "Wrap" },
  ],
};

/* ---------- core topics on cue ---------- */

export const topicCaching: FlowSpec = {
  id: "topic-caching",
  title: "Raise caching: the database is the bottleneck",
  description: "The trigger is a number: reads far above what the database can serve. The move is cache-aside in front of it.",
  nodes: [
    { id: "users", label: "Readers", kind: "client", col: 0, row: 1, sub: "100K reads/s" },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "cache", label: "Redis", kind: "cache", col: 2, row: 0, sub: "95% hits" },
    { id: "db", label: "Database", kind: "database", col: 2, row: 2, sub: "serves ~5K/s" },
  ],
  edges: [
    { from: "users", to: "app" },
    { from: "app", to: "cache", label: "read" },
    { from: "app", to: "db", label: "miss" },
  ],
  scenarios: [
    {
      id: "trigger",
      name: "The trigger",
      steps: [
        { edge: "users>app", caption: "100K reads a second arrive. That is the moment to speak, not earlier.", ms: 1800 },
        { edge: "app>db", tone: "error", caption: "Say: 100K reads a second against a database that serves about 5K. The database is 20 times short.", mark: [{ node: "db", state: "down" }], ms: 2400 },
      ],
    },
    {
      id: "move",
      name: "The move",
      steps: [
        { edge: "app>cache", caption: "Say: cache-aside with Redis, read-heavy data only. Per-user and write-heavy data stay uncached.", mark: [{ node: "cache", state: "hit" }, { node: "db", state: null }], ms: 2400 },
        { edge: "app>db", tone: "ok", caption: "At a 95% hit ratio the database sees 5K reads a second, exactly what it can serve. Add: stampede and staleness are the risks.", mark: [{ node: "db", state: "ok" }], ms: 2600 },
      ],
    },
  ],
};

export const topicQueues: FlowSpec = {
  id: "topic-queues",
  title: "Raise a queue: slow or bursty work",
  description: "The trigger is work the user should not wait for, or a burst a downstream cannot absorb. The move is to accept fast and process later.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "api", label: "API", kind: "service", col: 1, row: 1, sub: "replies fast" },
    { id: "queue", label: "Queue", kind: "queue", col: 2, row: 1, sub: "absorbs bursts" },
    { id: "worker", label: "Workers", kind: "worker", col: 3, row: 1, sub: "×N" },
    { id: "mail", label: "Email provider", kind: "external", col: 4, row: 1, sub: "rate limited" },
  ],
  edges: [
    { from: "client", to: "api", label: "POST" },
    { from: "api", to: "queue", label: "queue", style: "async" },
    { from: "queue", to: "worker", label: "pull", style: "async" },
    { from: "worker", to: "mail", label: "send" },
  ],
  scenarios: [
    {
      id: "trigger",
      name: "The trigger",
      steps: [
        { edge: "client>api", caption: "A campaign must reach 1M users. Sending inline would hold each request for the whole provider call.", ms: 2000 },
        { edge: "worker>mail", tone: "error", caption: "Say: the provider allows about 1,000 sends a second, so 1M emails take about 17 minutes. Nobody should wait on that.", mark: [{ node: "mail", state: "busy" }], ms: 2600 },
      ],
    },
    {
      id: "move",
      name: "The move",
      steps: [
        { edge: "client>api", caption: "Say: I would accept the request and return 202 right away.", mark: [{ node: "mail", state: null }], ms: 1800 },
        { edge: "api>queue", caption: "The job goes on a queue. The queue holds the burst.", mark: [{ node: "queue", state: "ok" }], ms: 1800 },
        { edge: "queue>worker", caption: "Workers pull at the pace the provider allows. Add workers to go faster.", ms: 1800 },
        { edge: "worker>mail", tone: "ok", caption: "Own the cost: delivery is at least once, so sends must be idempotent, and failed jobs go to a dead-letter queue.", mark: [{ node: "mail", state: "ok" }], ms: 2600 },
      ],
    },
  ],
};

export const topicSharding: FlowSpec = {
  id: "topic-sharding",
  title: "Raise sharding: one primary is out of room",
  description: "The trigger is writes or data beyond one machine. The real decision is the shard key: a good key spreads load, a bad one makes a hot shard.",
  nodes: [
    { id: "client", label: "Clients", kind: "client", col: 0, row: 1 },
    { id: "router", label: "Router", kind: "lb", col: 1, row: 1, sub: "hash of key" },
    { id: "s1", label: "Shard 1", kind: "database", col: 2, row: 0 },
    { id: "s2", label: "Shard 2", kind: "database", col: 2, row: 1 },
    { id: "s3", label: "Shard 3", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "client", to: "router" },
    { from: "router", to: "s1" },
    { from: "router", to: "s2" },
    { from: "router", to: "s3" },
  ],
  scenarios: [
    {
      id: "good",
      name: "Good key",
      steps: [
        { edge: "client>router", caption: "Trigger: 30,000 writes a second, and one primary tops out far below that. Say it, then ask about the key.", ms: 2200 },
        { edge: "router>s1", caption: "Say: shard by a hash of user id. Users spread evenly, so each of 3 shards takes about 10,000 writes a second.", with: [{ edge: "router>s2", caption: "" }, { edge: "router>s3", caption: "" }], mark: [{ node: "s1", state: "ok" }, { node: "s2", state: "ok" }, { node: "s3", state: "ok" }], ms: 2600 },
      ],
    },
    {
      id: "bad",
      name: "Bad key",
      steps: [
        { edge: "client>router", caption: "Now suppose the key is country. One country holds 60% of users.", mark: [{ node: "s1", state: null }, { node: "s2", state: null }, { node: "s3", state: null }], ms: 2000 },
        { edge: "router>s2", tone: "error", caption: "That shard takes 60% of the writes, about 18,000 a second, and the others sit idle. A hot shard.", mark: [{ node: "s2", state: "down" }], ms: 2600 },
        { edge: "router>s2", caption: "Say the cost out loud: sharding ends cross-shard joins, and changing the key later means moving data.", ms: 2400 },
      ],
    },
  ],
};

export const topicConsistency: FlowSpec = {
  id: "topic-consistency",
  title: "Raise consistency: where a stale read hurts",
  description: "The trigger is a replica or a cache serving a read after a write. The move is to say which reads must be fresh and which may lag.",
  nodes: [
    { id: "user", label: "User", kind: "client", col: 0, row: 1 },
    { id: "app", label: "App", kind: "service", col: 1, row: 1 },
    { id: "primary", label: "Primary", kind: "database", col: 2, row: 0, sub: "writes" },
    { id: "replica", label: "Replica", kind: "database", col: 2, row: 2, sub: "lags ~1 s" },
  ],
  edges: [
    { from: "user", to: "app" },
    { from: "app", to: "primary", label: "write" },
    { from: "primary", to: "replica", label: "copy", style: "replication" },
    { from: "app", to: "replica", label: "read" },
  ],
  scenarios: [
    {
      id: "bite",
      name: "Where it bites",
      steps: [
        { edge: "user>app", caption: "A user saves a new display name.", ms: 1600 },
        { edge: "app>primary", caption: "The write goes to the primary.", ms: 1600 },
        { edge: "app>replica", tone: "error", caption: "The next page load reads a replica that is about 1 second behind. The user sees the old name and thinks the save failed.", mark: [{ node: "replica", state: "miss" }], ms: 2600 },
      ],
    },
    {
      id: "fix",
      name: "The answer",
      steps: [
        { edge: "app>primary", caption: "Say: after a write, read your own data from the primary for a few seconds. That is read-your-writes.", mark: [{ node: "replica", state: null }, { node: "primary", state: "ok" }], ms: 2400 },
        { edge: "app>replica", tone: "ok", caption: "Everything else, such as another user's profile or a feed, can lag a second. Payments and balances never read a lagging copy.", mark: [{ node: "replica", state: "ok" }], ms: 2600 },
      ],
    },
  ],
};

/* ---------- common mistakes ---------- */

export const overEngineer: DecisionSpec = {
  id: "over-engineer",
  title: "Is this complexity earned?",
  start: "short",
  nodes: {
    short: { q: "Did your estimate show one database cannot keep up?", yes: "reads", no: "simple" },
    simple: { result: "Keep one database", why: "At 40 writes a second, say so and move on. Multi-region and sharding here cost minutes and score nothing." },
    reads: { q: "Are most of the extra requests reads?", yes: "cache", no: "shard" },
    cache: { result: "Add a cache, then read replicas", why: "Reads are the cheap problem to fix. A 95% hit ratio cuts database reads twentyfold." },
    shard: { result: "Shard by a key, and name its cost", why: "Only writes or data size beyond one primary justify it. State the key, why it spreads load, and what you lose." },
  },
};

export const failureWalk: FlowSpec = {
  id: "failure-walk",
  title: "Kill each box in turn",
  description: "After the happy path, walk the request path and ask of every box what happens when it dies and how you would know.",
  nodes: [
    { id: "client", label: "Client", kind: "client", col: 0, row: 1 },
    { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1, sub: "×2" },
    { id: "app", label: "App servers", kind: "service", col: 2, row: 1, sub: "×3" },
    { id: "db", label: "Database", kind: "database", col: 3, row: 1, sub: "primary + replica" },
  ],
  edges: [
    { from: "client", to: "lb" },
    { from: "lb", to: "app" },
    { from: "app", to: "db", label: "read" },
  ],
  scenarios: [
    {
      id: "weak",
      name: "Happy path only",
      steps: [
        { edge: "client>lb", caption: "A request goes in.", ms: 1400 },
        { edge: "lb>app", caption: "It reaches an app server.", ms: 1400 },
        { edge: "app>db", tone: "miss", caption: "It reads the database and returns. The candidate stops here, and the interviewer asks what happens when something breaks.", ms: 2400 },
      ],
    },
    {
      id: "strong",
      name: "Kill each box",
      steps: [
        { edge: "client>lb", tone: "error", caption: "Load balancer dies: the second one takes over, a health check notices in seconds.", mark: [{ node: "lb", state: "down" }], ms: 2400 },
        { edge: "lb>app", tone: "error", caption: "One app server dies: it is stateless, so the other two absorb its traffic after a failed health check.", mark: [{ node: "lb", state: "ok" }, { node: "app", state: "down" }], ms: 2400 },
        { edge: "app>db", tone: "error", caption: "The primary dies: promote the replica. Writes pause briefly and the last few writes may be lost, so say which.", mark: [{ node: "app", state: "ok" }, { node: "db", state: "down" }], ms: 2600 },
        { edge: "app>db", tone: "ok", caption: "Add the timeout: every call has one, so a slow database fails fast instead of hanging the app.", mark: [{ node: "db", state: "ok" }], ms: 2400 },
      ],
    },
  ],
};
