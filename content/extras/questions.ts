import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "parking-lot": {
    detail: [
      "scale-check",
      "public-interface",
      "what-it-remembers",
      "park-and-exit-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "persistence-across-gate-servers",
      "failure-modes",
    ],
    doodle: "strategy",
    sayIt: {
      answer:
        "I'd model ParkingLot, Floor and Spot, and keep a free set per spot type on each floor, so allocating a spot never scans. Spot choice and pricing sit behind small strategies, with a daily cap as a decorator. One Node process allocates atomically; across gate servers the database picks and locks a row with SKIP LOCKED.",
      numbers: [
        { value: "1,000 spots", label: "five floors of 200 spots each" },
        { value: "~500 / hour", label: "entries at peak, under one per second" },
        { value: "O(types)", label: "allocation cost with free sets per type" },
      ],
      tradeoffs: [
        "Free sets per type vs a scan: allocation is O(types) and pays off past hundreds of spots, but there is more state to keep consistent.",
        "Strategy classes vs if/else: rules are swappable and testable, and rules do change, but you get more files.",
        "In-memory vs DB as source of truth: simple and fast for one gate controller, but it only works in one process.",
      ],
      mention:
        "Two gates must never hand out the same spot: an atomic take() in one process, SKIP LOCKED across servers, with the ticket inserted in the same transaction so a crash cannot leak a spot.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "List the questions you would ask about vehicles, pricing, payment and whether this is one lot or a chain.",
          hint: "Which vehicles fit which spots, how pricing works, and one lot or a chain of lots decide the design.",
        },
        {
          id: "estimate",
          prompt: "Size the lot, say whether a scan would matter, then name what is actually hard.",
          hint: "Five floors of 200 spots is 1,000 spots and about 500 entries an hour, so correctness is hard, not speed.",
        },
        {
          id: "interface",
          prompt: "Write the public calls for parking, quoting, exiting and availability, with what each returns and how each fails.",
          hint: "park returns a Ticket or 'Lot full for car'; exit takes the ticket id and payment and returns the fee and change.",
        },
        {
          id: "design",
          prompt: "Name the classes, say what each owns, and pick the two rules that become strategies.",
          hint: "The lot owns floors, floors own spots and free sets, a ticket only references a spot; pricing is a strategy with decorators.",
        },
        {
          id: "deepdive",
          prompt: "Two gates reach the last compact spot at once. Explain how only one gets it, in one process and across servers.",
          hint: "One Node process runs take() without interleaving; several servers need one UPDATE with FOR UPDATE SKIP LOCKED.",
        },
      ],
      checklist: [
        "Asks which vehicles fit which spots and how pricing works",
        "Sizes the lot at 1,000 spots, so correctness beats speed",
        "Keeps a free set per spot type, so allocation never scans",
        "Puts spot choice and pricing behind strategies, with a daily-cap decorator",
        "Answers 'two gates, one spot' with atomic take or SKIP LOCKED",
        "Updates display boards through an observer, not direct calls",
        "Tests with an injected clock, including hour boundaries and the daily cap",
        "Avoids over-modelling: no class per spot size, no manager per noun",
      ],
    },
  },

  elevator: {
    detail: [
      "public-interface",
      "what-it-remembers",
      "hall-call-to-doors-open-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "capacity-estimate",
      "failure-modes",
    ],
    doodle: "state-machine",
    sayIt: {
      answer:
        "I'd split the problem in two: dispatch decides which car answers a hall call, and scheduling decides the order a car serves its stops. Each car is a state machine running LOOK over up-stops and down-stops, so no floor waits more than two sweeps. One controller owns every hall call and gives it to exactly one car through a pluggable strategy.",
      numbers: [
        { value: "2 sweeps", label: "longest wait bound under LOOK" },
        { value: "~148 s", label: "round-trip time in the 20-floor example" },
        { value: "72 s vs 52 s", label: "time stopping versus travelling per trip" },
      ],
      tradeoffs: [
        "FCFS vs nearest car: FCFS is trivial and fair by arrival but zig-zags; direction-aware nearest car gives short waits but commits at press time.",
        "Nearest car vs collective: collective keeps no assignment state and suits small groups, but cars bunch and calls may wait.",
        "One controller vs none: no double service of a call, but a single point of failure, so cars fall back to local mode.",
      ],
      mention:
        "When a car fails or goes out of service, its hall calls move to other cars keeping their queue place, and riders exit at the next floor.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask the questions about floors, cars, building type and failures that you need answered before drawing a class.",
          hint: "How many floors and cars, an office or a hospital, buttons per floor or a lobby keypad, and what a fire alarm does.",
        },
        {
          id: "estimate",
          prompt: "Size the building: how many cars it needs, and why controller load is not the hard part.",
          hint: "Size for the up-peak, with a round trip near 148 s; 120 presses in 5 minutes is only 0.4 per second.",
        },
        {
          id: "interface",
          prompt: "List the public calls for hall calls, car calls, ticking and taking a car out of service, with returns.",
          hint: "hallCall(floor, dir) returns a car id or null and is idempotent; tick() advances every car, and tests drive it.",
        },
        {
          id: "design",
          prompt: "Name the classes and what each owns, then separate dispatch from scheduling and place the strategy.",
          hint: "The controller owns hall calls and a DispatchStrategy; each car owns its state machine, upStops and downStops.",
        },
        {
          id: "deepdive",
          prompt: "Explain how one car orders its stops, and how a double press of one button reaches exactly one car.",
          hint: "LOOK sweeps and turns at the last request; presses go to one controller loop, so the second finds 5▲ already assigned.",
        },
      ],
      checklist: [
        "Draws one car as a state machine with doors-only-when-stopped safety",
        "Separates dispatch (which car) from scheduling (what order)",
        "Picks LOOK and states the two-sweep waiting bound",
        "Gives each hall call exactly one owner, even on a double press",
        "Compares FCFS, nearest car and collective with their costs",
        "Hands calls to other cars when a car goes out of service",
        "Backs the car count with round-trip-time numbers",
        "Injects the tick so tests are deterministic",
      ],
    },
  },

  "vending-machine": {
    detail: [
      "scale-check",
      "public-interface",
      "what-it-remembers",
      "buy-one-item-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "telemetry-for-a-fleet",
      "failure-modes",
    ],
    doodle: "state-machine",
    sayIt: {
      answer:
        "This is a state machine in disguise: Idle, HasMoney, Dispensing and OutOfService, with a table that gives every state and event pair exactly one outcome. Money stays in integer cents and in escrow until the drop sensor confirms. I make change with a bounded DP over the real coins in the tubes, and if there's no change, there's no sale.",
      numbers: [
        { value: "32 cells", label: "4 states times 8 events, one outcome each" },
        { value: "1 per 36 s", label: "event rate at a busy office machine" },
        { value: "65, not 0.65", label: "cola price as integer cents, never floats" },
      ],
      tradeoffs: [
        "Table vs switch: every cell is visible and unlisted means rejected, at the cost of more structure for two or three states.",
        "Bounded DP vs greedy: DP finds change whenever it exists, even with low tubes, for a little more code.",
        "Escrow vs a credit number: exact refunds and a commit on a confirmed drop, but you track coins, not a total.",
      ],
      mention:
        "An item that never drops: with no beam break in 2 seconds, retry once, then dropFailed refunds the escrow and flags the slot, so a paying customer never gets nothing.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask what payment methods, change source, sold-out behaviour and drop sensor you can assume.",
          hint: "Coins only or cards, change from the machine's own tubes (so it can fail), credit kept after SOLD OUT, a drop sensor.",
        },
        {
          id: "estimate",
          prompt: "Size the machine: events per day, and why speed is irrelevant but one wrong transition is costly.",
          hint: "About 300 items a day is roughly 1,500 events, one every 36 seconds: a microcontroller copes, correctness is the hard part.",
        },
        {
          id: "interface",
          prompt: "List the events send() accepts, which states accept each one, and what the outcome is.",
          hint: "coin, select, cancel, dropped, dropFailed, service, restock and refill all arrive as one event on machine.send.",
        },
        {
          id: "design",
          prompt: "Name the four states and classes, and say what the table does with an event a state doesn't accept.",
          hint: "A missing cell is a rejection that changes nothing; the machine holds Inventory, CoinBox, escrow and pending.",
        },
        {
          id: "deepdive",
          prompt: "Owe 30 cents with one quarter and three dimes in the tubes. Explain why greedy fails and what you do instead.",
          hint: "Greedy takes the 25¢ and then needs a missing 5¢; a bounded DP over the real counts finds three dimes.",
        },
      ],
      checklist: [
        "Says 'this is a state machine' early and lists four states",
        "Gives one outcome in every state and event cell",
        "Makes rejections change nothing, checked before any mutation",
        "Stores money as integer cents and explains why",
        "Holds coins in escrow until the drop sensor confirms",
        "Shows greedy change failing and uses a bounded DP instead",
        "Refuses the sale and refunds when no change is possible",
        "Handles a stuck item and a power cut mid-purchase",
      ],
    },
  },

  "rate-limiter": {
    primer: "rate-limiter",
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "rate-limiter",
    sayIt: {
      answer:
        "I'd use a token bucket per user, API key or IP, stored in Redis and updated by one Lua script on Redis's own clock, so the check is atomic across every app server. The gateway answers 429 with Retry-After. If Redis dies, most endpoints fail open to a local bucket, but login and OTP fail closed.",
      numbers: [
        { value: "10K req/s", label: "peak traffic, one script call each" },
        { value: "~200 MB", label: "memory for 1M active keys" },
        { value: "< 5 ms", label: "added p99 latency target" },
      ],
      tradeoffs: [
        "Central Redis vs local only: accurate global limits, but you add a network hop and a dependency.",
        "Token bucket vs sliding window: bursts and tiny state, but a looser 'per minute' limit.",
        "Fail open vs closed: open keeps the API available, but allows abuse during outages.",
      ],
      mention:
        "If Redis is down or slow, fail fast with a 50 ms timeout, then fall back per rule: a local bucket for normal endpoints, a 503 for login and payments.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask who is limited, whether bursts are allowed, hard or soft limits, regions, and what happens if the limiter fails.",
          hint: "User, API key or IP; bursts or smooth traffic; reject or just log; one region or global; fail open or closed.",
        },
        {
          id: "estimate",
          prompt: "Estimate peak requests per second and memory for a million active keys, then say if one Redis is enough.",
          hint: "10K req/s against about 100K ops/s per primary; 1M keys is about 200 MB; shard with Redis Cluster when it can't.",
        },
        {
          id: "interface",
          prompt: "Define what the gateway calls and what a rejected client sees, including the headers.",
          hint: "check(key, ratePerSec, capacity) returns ok, remaining and retryAfterMs; a 429 carries RateLimit-Limit, RateLimit-Remaining and Retry-After.",
        },
        {
          id: "design",
          prompt: "Choose the algorithm, where its state lives and where the limit is enforced, and justify each.",
          hint: "A token bucket in a Redis hash that expires at full refill; global limits at the gateway, expensive operations in the service.",
        },
        {
          id: "deepdive",
          prompt: "Fifty servers each read 'one token left' and both spend it. Explain how you prevent that and which clock you use.",
          hint: "One Lua script reads, refills, takes and writes; read TIME inside it so a skewed server clock cannot mint tokens.",
        },
      ],
      checklist: [
        "Asks who is limited and whether bursts are allowed",
        "Compares fixed window, sliding window and token bucket honestly",
        "Notes a fixed window allows 2x the limit at window edges",
        "Makes check-and-spend atomic with one Lua script",
        "Uses Redis TIME instead of app server clocks",
        "Returns 429 with Retry-After computed from the token deficit",
        "Chooses fail open or closed per endpoint, and says why",
        "Bounds memory by expiring keys at the full-refill time",
      ],
    },
  },

  "movie-booking": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "implementation",
      "failure-modes",
    ],
    doodle: "database",
    sayIt: {
      answer:
        "Every seat is a state machine: available, held for five minutes, then booked. I hold all the requested seats with one conditional UPDATE, so Postgres row locks pick exactly one winner per seat and nobody double-books. Payment carries an idempotency key, and the verified webhook confirms only if the hold is still mine, otherwise it refunds. Launches get a waiting room.",
      numbers: [
        { value: "5 min", label: "seat hold before it expires" },
        { value: "~100K req/s", label: "seat-map reads without a CDN" },
        { value: "200 per second", label: "shoppers admitted per hot show" },
      ],
      tradeoffs: [
        "Conditional UPDATE vs SELECT FOR UPDATE: one round trip and short locks, but less flexible logic.",
        "DB holds vs Redis holds: one source of truth, at the cost of more database writes.",
        "Countdown vs silently extending holds: fair and predictable, but some sales are lost.",
      ],
      mention:
        "Double-booking is the one to raise: the hold is a single conditional UPDATE under row locks, and a payment landing after the hold expired books only if the hold is still mine, otherwise it refunds.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about seats per booking, hold length, how payment is confirmed, and assigned seating versus general admission.",
          hint: "Maximum seats per booking, how long a hold lasts, payment sync or by webhook, waitlists, and assigned seats or a counter.",
        },
        {
          id: "estimate",
          prompt: "Estimate average bookings per second, then the launch spike, and say which one drives the design.",
          hint: "10M a month is about 4 per second; 500K viewers refreshing every 5 s is 100K requests per second, so cache seat maps.",
        },
        {
          id: "interface",
          prompt: "List the endpoints for seat maps, holds, payment and confirmation, and say what a taken seat returns.",
          hint: "POST /shows/:id/holds returns 201 with holdId and expiresAt, or 409 if taken; payments use an Idempotency-Key.",
        },
        {
          id: "design",
          prompt: "Describe the seat state machine and the single statement that holds several seats atomically.",
          hint: "available, held, booked; one UPDATE matching available or expired-held seats, rolled back if rowCount falls short.",
        },
        {
          id: "deepdive",
          prompt: "Alice and Bob click A5 together, then Alice pays after her hold expired. Explain what happens at each step.",
          hint: "Bob's UPDATE waits on the row lock and matches zero rows; the webhook books only if held_by is still her, else it refunds.",
        },
      ],
      checklist: [
        "States the invariant: a seat is booked at most once",
        "Models seats as available, held and booked with a hold expiry",
        "Holds all requested seats in one conditional UPDATE, or none",
        "Explains why row locks give exactly one winner",
        "Uses an idempotency key and confirms from the payment webhook",
        "Refunds when the webhook arrives after the hold was lost",
        "Expires holds lazily, with a sweeper only for honest seat maps",
        "Protects launches with a waiting room and a cached seat map",
      ],
    },
  },

  leaderboard: {
    primer: "db-index",
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "submitting-a-score",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "index",
    sayIt: {
      answer:
        "Each board is a Redis sorted set, so adding points, the top 100 and any player's rank all cost O(log n). Validated results go through Kafka into one Lua script per event that skips replayed offsets, so nothing counts twice. Redis is a rebuildable index, not the source of truth: the database holds the durable totals.",
      numbers: [
        { value: "12K events/s", label: "peak score events" },
        { value: "~17 GB", label: "all boards together: one primary plus a replica" },
        { value: "O(log n)", label: "add points, top 100 and rank" },
      ],
      tradeoffs: [
        "Sorted set vs SQL index: O(log n) rank over millions, but memory-bound with a derived copy to sync.",
        "Kafka first vs writing Redis directly: durable before the 202 and replayable, but about 100 ms lag and more moving parts.",
        "Shard by player hash vs score range: hash gives even writes but fans out reads; range reads top K from one shard but runs hot.",
      ],
      mention:
        "Kafka redelivers and ZINCRBY isn't idempotent, so points would count twice; the script stores each partition's last applied offset and skips anything at or below it, atomically.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask which queries matter, how ties break, which time windows exist, and who computes the score.",
          hint: "Top K, my rank and around me; shared rank or first to reach wins; daily, weekly, all-time; a trusted game server or the client.",
        },
        {
          id: "estimate",
          prompt: "Estimate peak score events per second and memory for all boards, then decide whether to shard.",
          hint: "200M events a day is 2.3K per second and 12K at peak; about 17 GB in total, so one primary plus a replica.",
        },
        {
          id: "interface",
          prompt: "List the submit, top K, my rank and around-me endpoints, and say who may call submit.",
          hint: "POST /matches/:id/result comes from signed match servers and returns 202; GET .../top?n=100 is cached for 1 s.",
        },
        {
          id: "design",
          prompt: "Say which structure answers each query, why a SQL index fails for rank, and how time windows are stored.",
          hint: "A B-tree stores no counts, so rank reads every entry above you; a sorted set sums span counts; one key per period.",
        },
        {
          id: "deepdive",
          prompt: "Kafka redelivers a score after a failover. Explain how points are not counted twice and what recovers a lost Redis.",
          hint: "The Lua script checks the stored offset atomically with the board change; rebuild from player_totals, then replay Kafka.",
        },
      ],
      checklist: [
        "Names 'what is my rank' as the hard query",
        "Explains why a sorted set makes rank O(log n)",
        "States a tie rule and the 2^53 composite-score limit",
        "Keys daily and weekly boards by when the match was played",
        "Treats Redis as a rebuildable index, fed idempotently via offsets",
        "Does the arithmetic and concludes one node suffices before sharding",
        "Shards by player hash, merging full top K and summing rank counts",
        "Mentions anti-cheat: signed scores, plausibility rules, voiding events",
      ],
    },
  },

  "payment-system": {
    primer: "idempotency",
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "idempotency",
    sayIt: {
      answer:
        "This is correctness under failure, not scale. Every checkout carries an idempotency key claimed under a unique constraint, and a PSP timeout means unknown, never failed; a deduplicated webhook or a status query settles it. Money moves as append-only double-entry ledger transactions written with an outbox event, and daily reconciliation catches whatever slips through.",
      numbers: [
        { value: "~1,160/s", label: "peak payments, 10x the 116/s average" },
        { value: "$500M/day", label: "money moved; 0.01% errors is 1,000 payments" },
        { value: "24 hours", label: "minimum time idempotency keys are kept" },
      ],
      tradeoffs: [
        "Ledger vs a balance column: full history, audits and rebuilds, but more rows and balances need aggregating or caching.",
        "Idempotency in the DB vs Redis: atomic with the payment, but more load on the primary.",
        "Sync charge vs async: instant answer and simple, but latency and uptime are tied to the PSP.",
      ],
      mention:
        "Money moving twice: a lost reply, a double tap or a duplicate webhook must each produce exactly one charge and one ledger posting, which unique constraints guarantee.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about parties, payment methods, charge-now versus authorize-and-capture, currencies, refunds and peak load.",
          hint: "A marketplace or one merchant; cards answer in a second, bank debits by webhook hours later; partial refunds.",
        },
        {
          id: "estimate",
          prompt: "Estimate payments per second, calls waiting on the PSP, and what a small error rate costs at this volume.",
          hint: "10M a day is 116 per second, 1,160 at peak, so 1,160 calls in flight; 0.01% errors is 1,000 wrong payments daily.",
        },
        {
          id: "interface",
          prompt: "Define POST /payments and its idempotency behaviour: a replay, a concurrent duplicate and a changed body.",
          hint: "Same key and body replays the stored response; still running is 409; a different body is 422; keys are kept 24 hours.",
        },
        {
          id: "design",
          prompt: "Describe the write path from key claim to ledger and event, and say where each transaction ends.",
          hint: "Claim the key and create the payment in one transaction, commit before the PSP call, then record outcome, ledger and outbox.",
        },
        {
          id: "deepdive",
          prompt: "The PSP call times out and the card may have been charged. Explain what you record, return and do next.",
          hint: "Mark it unknown and return 202; retry with your own key; the webhook or a status query decides, never a guess.",
        },
      ],
      checklist: [
        "Says 'a timeout means unknown' before being asked",
        "Claims idempotency keys under a unique constraint, in one transaction",
        "Holds no transaction or lock across the PSP call",
        "Verifies, dedupes and orders webhooks, answering 200 fast",
        "Uses an append-only double-entry ledger in integer minor units",
        "Writes an outbox event with the ledger entry; consumers dedupe",
        "Runs daily reconciliation and fixes forward, never by editing history",
        "Keeps card data with the PSP to minimise PCI scope",
      ],
    },
  },

  typeahead: {
    detail: ["how-to-approach-it", "step-by-step-answer", "implementation", "failure-modes"],
    doodle: "trie",
    sayIt: {
      answer:
        "I'd debounce input by about 250 ms with a two-character minimum, and abort the stale request on every change so an old answer never overwrites a new one. A small per-query LRU cache with a 60 second TTL makes backspace instant. The UI is an accessible ARIA combobox, and the server uses a top-K trie behind a CDN.",
      numbers: [
        { value: "250 ms", label: "debounce after the last keystroke" },
        { value: "100 entries", label: "client LRU cache cap, with a 60 s TTL" },
        { value: "O(prefix length)", label: "trie lookup with top-8 completions per node" },
      ],
      tradeoffs: [
        "Longer vs shorter debounce: fewer requests but it feels slower; 200 to 300 ms is the sweet spot.",
        "Debounce vs throttle: debounce sends the fewest requests, but nothing updates mid-burst.",
        "Trie vs search engine: O(prefix) lookups with no extra infrastructure, but exact prefixes only and a rebuild to update.",
      ],
      mention:
        "Responses can arrive out of order: debounce cuts requests but two can still be in flight, so abort the older one and ignore any result whose signal was aborted.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask whether suggestions come from an API or a local list, how many there are, and the keyboard and mobile needs.",
          hint: "A remote API or a small list; about 8 strings or rich items; search box or form field; screen readers and IME input.",
        },
        {
          id: "estimate",
          prompt: "Size the problem: how many requests a fast typist sends, and how debounce, minimum length and caching cut them.",
          hint: "A fast 'react' sends 1 request, not one per key; a 2-character minimum and the client cache absorb the rest.",
        },
        {
          id: "interface",
          prompt: "Write the component props, the hook's options and result, and the suggest endpoint with its caching headers.",
          hint: "Typeahead takes fetchSuggestions and onSelect; GET /api/suggest?q=rea&limit=8 is public with max-age=300.",
        },
        {
          id: "design",
          prompt: "Split the frontend into components, say what state each owns, and say where the cache is checked.",
          hint: "Typeahead holds UI state; useTypeahead holds the query, timer, AbortController and LRU; check the cache before the timer starts.",
        },
        {
          id: "deepdive",
          prompt: "The user pauses twice and the older request answers last. Explain how you stop stale results showing.",
          hint: "Abort in the effect cleanup, and also check the signal after the await, since some servers ignore aborts.",
        },
      ],
      checklist: [
        "Debounces about 250 ms with a minimum query length",
        "Raises the stale-response race unprompted and aborts old requests",
        "Caches per query with LRU and TTL, checked before the timer",
        "Uses the ARIA combobox roles with aria-activedescendant for keyboard navigation",
        "Highlights matches with mark elements, never HTML strings",
        "Covers loading, empty and error states quietly",
        "Handles IME composition by ignoring keys while composing",
        "Backs it with a top-K trie behind a CDN",
      ],
    },
  },

  "infinite-feed": {
    detail: ["how-to-approach-it", "step-by-step-answer", "implementation", "failure-modes"],
    doodle: "cache",
    sayIt: {
      answer:
        "I'd put an IntersectionObserver on a sentinel at the bottom that fetches the next page by cursor, one request at a time, with a Retry button on errors. Pages live in an infinite-query cache and rows are virtualized, so the DOM holds about 20 rows and Back returns to the same post instantly.",
      numbers: [
        { value: "~20 rows", label: "in the DOM with 10,000 posts loaded" },
        { value: "20 per page", label: "typical page size" },
        { value: "600px", label: "rootMargin to prefetch about a screen early" },
      ],
      tradeoffs: [
        "Virtualization vs a plain list: constant DOM size, but it breaks Ctrl+F and needs measuring; use it past a few hundred items.",
        "Cursor vs offset pagination: stable as items arrive and fast deep pages, but no jumping to page 37.",
        "Infinite scroll vs Load more: seamless, but the footer is unreachable and keyboard users struggle.",
      ],
      mention:
        "A failed fetch must not freeze the feed: reset the in-flight flag in finally and show Retry, rather than looping against a struggling server.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about page size and ordering, item height, how Back should behave, real-time updates and SEO.",
          hint: "Newest first or ranked, variable heights, session length, Back landing on the same post, and server-rendering page one.",
        },
        {
          id: "estimate",
          prompt: "Size the problem: how many items a long session loads and how many the DOM should ever hold.",
          hint: "Thousands of posts may load, but virtualization keeps about 20 rows mounted, so rendering stays cheap.",
        },
        {
          id: "interface",
          prompt: "Write the feed endpoint with its cursor, and the hook that components use to load more.",
          hint: "GET /api/feed?cursor=p_160&limit=20 returns data and nextCursor; useInfiniteFeed returns items, status, loadMore and sentinel.",
        },
        {
          id: "design",
          prompt: "Name the components and the data layer, and say what each owns: first page, loader row, cache and banner.",
          hint: "FeedPage server-renders page one; Feed seeds an infinite query and renders virtualized rows, a loader row and NewPostsBanner.",
        },
        {
          id: "deepdive",
          prompt: "Five new posts arrive while the user scrolls. Explain why page numbers break, what you use, and how new posts appear.",
          hint: "Offsets shift by 5 and repeat posts; use a cursor (id < $1); show a banner, never insert above the reader.",
        },
      ],
      checklist: [
        "Uses an IntersectionObserver sentinel instead of scroll listeners",
        "Paginates by cursor and explains the offset problems",
        "Allows one request in flight, with Retry and no automatic loop",
        "Virtualizes rows and states about 20 are in the DOM",
        "Restores Back from the query cache plus a scroll anchor",
        "Reserves image boxes to prevent layout shift",
        "Adds feed roles, aria-posinset and a keyboard-reachable footer",
        "Shows a new posts banner rather than shifting content",
      ],
    },
  },

  chat: {
    primer: "realtime",
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
      "build-it-in-the-playground",
    ],
    doodle: "websocket",
    sayIt: {
      answer:
        "Clients hold a WebSocket to any gateway, and Redis pub/sub routes each message to the gateway holding the recipient. Every message gets a per-conversation sequence number, is stored before it's acked, and carries a client id so retries are deduplicated. Offline users sync from their last seq, which also repairs any lost live message.",
      numbers: [
        { value: "10M sockets", label: "concurrent connections to design for" },
        { value: "~200 gateways", label: "at about 50K connections each" },
        { value: "< 200 ms", label: "delivery to online users in-region" },
      ],
      tradeoffs: [
        "WebSocket vs long polling: low latency and two-way, but stateful connections to scale.",
        "Redis pub/sub vs Kafka for routing: simple and fast, but no durability or replay; durability comes from the database plus sync.",
        "Fan-out on write vs read for groups: fast reads, but write amplification, so large channels fan out on read.",
      ],
      mention:
        "Never ack before storing: a crash after the ack loses a message the sender thinks was delivered, so store first, then ack, then fan out.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about group sizes, receipts, multi-device, history and encryption, and the number of concurrent connections.",
          hint: "50, 500 or 100K members decides fan-out; delivery and read receipts; does my phone's message appear on my laptop.",
        },
        {
          id: "estimate",
          prompt: "Estimate messages per second, daily storage and gateway count, and say which number shapes the design.",
          hint: "2B messages a day is about 23K per second; 10M concurrent at about 50K per gateway is 200 nodes, so connections drive it.",
        },
        {
          id: "interface",
          prompt: "List the WebSocket events in each direction and the REST calls for history and uploads.",
          hint: "send, sync, read and typing go up; ack, message and receipt come down; history pages by seq cursor; uploads are presigned.",
        },
        {
          id: "design",
          prompt: "Describe the gateways, how a message reaches a recipient on another gateway, and where seq numbers and state live.",
          hint: "Gateways subscribe to user:ID channels; seq comes from INCR seq:CONVERSATION; the database is the source of truth.",
        },
        {
          id: "deepdive",
          prompt: "The sender's ack is lost and the client retries. Explain how you avoid a duplicate and repair a lost live message.",
          hint: "A unique (from, clientId) index turns the retry into a re-ack; sync from the last seq repairs misses.",
        },
      ],
      checklist: [
        "Says 'store, then ack, then fan out' with a client id",
        "Chooses WebSockets online and push notifications offline",
        "Keeps a set of sockets per user for multi-device",
        "Orders by per-conversation seq, not a global sequencer",
        "Syncs from the last seq on reconnect to repair gaps",
        "Uses read and delivered watermarks instead of a row per message",
        "Uses TTL heartbeats for presence; typing is throttled and never stored",
        "Jitters reconnects so a dead gateway causes no thundering herd",
      ],
    },
  },

  "news-feed": {
    primer: "queue",
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
      "build-it-in-the-playground",
    ],
    doodle: "pubsub",
    sayIt: {
      answer:
        "I'd use hybrid fan-out. A normal user's post is pushed into each active follower's capped Redis feed, so a read is one lookup. Celebrities, over about 100K followers, are pulled and merged at read time, so one post never costs millions of writes. Reads hydrate ids through a post cache and page with a score cursor.",
      numbers: [
        { value: "580 to 116K/s", label: "posts per second become fan-out writes" },
        { value: "~100K followers", label: "celebrity threshold: pull instead of push" },
        { value: "800 ids", label: "cap on each user's cached feed" },
      ],
      tradeoffs: [
        "Push vs pull: push makes reads one lookup but write cost grows with followers; pull writes once but every read merges timelines.",
        "Cache every feed vs active users only: no rebuilds, but terabytes of RAM for people who never look.",
        "Lower vs higher celebrity threshold: less write amplification, but more read-time merging.",
      ],
      mention:
        "Raise the celebrity problem yourself: pure push breaks for a 30M-follower account, since at 100K writes per second one post takes 5 minutes to reach everyone.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask whether the feed is ranked, how many follows and followers exist, how fresh it must be, and whether celebrities exist.",
          hint: "Ranked or chronological, a follow limit, seconds or a minute of freshness, and millions of followers (the crux).",
        },
        {
          id: "estimate",
          prompt: "Estimate feed reads and fan-out writes per second, and say what the ratio tells you about where to do the work.",
          hint: "35K reads per second against 580 posts per second is 60 to 1, so pay at write time; 200 followers each makes 116K writes per second.",
        },
        {
          id: "interface",
          prompt: "List the post, feed, follow and new-count endpoints, and say how paging works.",
          hint: "GET /feed?cursor=&limit=20 returns posts and nextCursor, the last post's timestamp; POST /posts fans out asynchronously.",
        },
        {
          id: "design",
          prompt: "Compare push and pull, choose a strategy, and say where the feed lives and what it stores.",
          hint: "Hybrid: a sorted set feed:USER scored by time holding the newest 800 ids; celebrities merged at read, hydrated via the post cache.",
        },
        {
          id: "deepdive",
          prompt: "An account has 30 million followers. Explain what breaks under push and how an author crossing 100K followers is handled.",
          hint: "Pull celebrities at read time and dedupe by post id, since already-pushed posts stay in followers' feeds.",
        },
      ],
      checklist: [
        "Notes the 60-to-1 read-to-post ratio and justifies write-time work",
        "Compares push and pull with their costs before choosing",
        "Raises the celebrity problem unprompted and proposes a hybrid threshold",
        "Stores post ids in a capped sorted set, not whole posts",
        "Pages with a score cursor, not list offsets",
        "Skips inactive users in fan-out and rebuilds on login",
        "Filters deleted posts and unfollows at read time",
        "Shows a new posts banner instead of inserting above the reader",
      ],
    },
  },

  "ride-sharing": {
    detail: [
      "capacity-estimate",
      "api",
      "data-model",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "failure-modes",
    ],
    doodle: "shard",
    sayIt: {
      answer:
        "Drivers send a fix every 4 seconds, 1.25M a second at peak, so I overwrite the latest position in a per-city Redis GEO index and never write a database row. To match, I search the rider's cell and its 8 neighbours, rank by ETA, and offer to one driver at a time behind a compare-and-set, so no driver gets two rides.",
      numbers: [
        { value: "1.25M/s", label: "location updates at peak" },
        { value: "~1 GB", label: "latest positions for 5M drivers" },
        { value: "10 to 15 s", label: "driver time to answer an offer" },
      ],
      tradeoffs: [
        "Geohash vs H3: geohash is plain strings with Redis GEO built in but needs neighbour reads; H3 has equidistant rings but needs a library.",
        "One offer at a time vs batch matching: simple, nearest driver first, but greedy and each decline costs up to 15 s.",
        "Push vs poll for rider updates: fresh within a second with no wasted requests, but a socket per rider.",
      ],
      mention:
        "Two matchers racing for the same driver: reserve the driver with a TTL'd compare-and-set before sending the offer, so the loser gets 0 and tries its next candidate.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about scale, location freshness, matching rules, offer timeouts, and products like pooled rides and surge.",
          hint: "Drivers online at peak, how stale a position may be (4 s here), nearest or shortest ETA, one offer at a time.",
        },
        {
          id: "estimate",
          prompt: "Estimate location updates per second and memory for latest positions, and say why that drives the design, not matching.",
          hint: "5M drivers every 4 s is 1.25M per second; latest positions fit in about 1 GB; matching is only about 2K searches per second.",
        },
        {
          id: "interface",
          prompt: "List the driver and rider WebSocket messages and the REST calls for estimating, requesting and cancelling a ride.",
          hint: "location every ~4 s plus offer and offer_reply; POST /rides carries an Idempotency-Key so a double tap makes one ride.",
        },
        {
          id: "design",
          prompt: "Say where live positions and driver state live, how space is indexed, and how the system is partitioned.",
          hint: "A GEO key per city in Redis with TTL'd loc records; geohash cells; the city is the shard; rides in Postgres.",
        },
        {
          id: "deepdive",
          prompt: "Two matchers pick the same nearest driver at once. Explain how exactly one gets the offer, and what a decline does.",
          hint: "Compare-and-set AVAILABLE to OFFERED with a reservation TTL; silence for 10 to 15 s is a decline, then the next candidate.",
        },
      ],
      checklist: [
        "Does the 1.25M/s arithmetic and picks a latest-fix-only index",
        "Overwrites positions with TTLs instead of writing database rows",
        "Searches the rider's cell plus 8 neighbours, because cells have edges",
        "Ranks by ETA rather than straight-line distance",
        "Reserves the driver with a compare-and-set before every offer",
        "Treats silence as a decline and expires stuck reservations",
        "Backs it with a unique index: one active ride per driver",
        "Interpolates the car marker and resyncs after reconnecting",
      ],
    },
  },
};
