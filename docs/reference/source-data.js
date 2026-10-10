// Content copied from the original single-file app "system-design-suite (1).html".
// Reference only (not imported by the site). H = HLD path steps, Q = questions,
// QX = per-question approach steps + Mermaid diagram, DD = deep dives.
// dg = diagram { t: title, n: [id, label, col, row, kind], e: [from, to, label?] }
// kinds: c client, l gateway/LB, s service, d database, k cache, q queue, x external
// ch = chart { t, y, type: 'b' bar | 'l' line, d: [[label, value]] }
// subs = [title, text] cards, qa = [question, answer], nx = "next" note.

export const H = [
{t:"Requirements and Estimation",why:"Every design starts with what to build and how big it is. Numbers decide whether you need one server or fifty, a cache or a shard.",
dg:{t:"Interview flow",n:[["r","Requirements",0,0,"c"],["e","Estimate scale",1,0,"s"],["a","APIs",2,0,"s"],["m","Data model",3,0,"d"],["h","Architecture",4,0,"l"],["t","Deep dive",4,1,"k"]],e:[["r","e"],["e","a"],["a","m"],["m","h"],["h","t","trade-offs"]]},
ch:{t:"Peak QPS by daily active users (10 actions/user, peak = 3x average)",y:"QPS",type:"b",d:[["1M DAU",350],["10M DAU",3500],["100M DAU",35000]]},
subs:[["Functional requirements","What users can do: shorten a URL, post a message, search. Confirm scope and cut features aloud before designing."],["Non-functional requirements","Latency target, availability (99.9% or 99.99%), consistency need, durability, and scale. These drive every later choice."],["Back-of-envelope math","QPS = users x actions / 86,400. Multiply by 2 to 5 for peak. Storage = writes/day x size x retention x replicas."],["Read vs write ratio","A 100:1 read-heavy system needs caches and replicas; a write-heavy one needs sharding and queues."]],
code:"function estimate(dau, actions, readRatio, bytesPerWrite, years) {\n  const qps = dau * actions / 86400;\n  const writeQps = qps / (readRatio + 1);\n  const storageTB = writeQps * 86400 * 365 * years * bytesPerWrite / 1e12;\n  return { qps, peak: qps * 3, writeQps, storageTB };\n}\nconsole.log(estimate(10e6, 10, 10, 1000, 5)); // ~1157 qps, peak ~3.5k, ~17TB",
qa:["How do you estimate QPS in an interview?","State assumptions, compute average QPS from daily users and actions divided by 86,400, then multiply for peak. Split reads and writes, since they scale differently, and note the dominant bottleneck."],
nx:"Next: once you know the load, you spread it across servers with a load balancer."},
{t:"Client, API and Load Balancing",why:"One server is a limit and a single point of failure. Stateless servers plus a balancer let you add capacity by adding machines.",
dg:{t:"Request path",n:[["c","Client",0,1,"c"],["g","API Gateway",1,1,"l"],["lb","Load Balancer",2,1,"l"],["s1","Service A",3,0,"s"],["s2","Service B",3,1,"s"],["s3","Service C",3,2,"s"],["db","Database",4,1,"d"]],e:[["c","g"],["g","lb"],["lb","s1"],["lb","s2"],["lb","s3"],["s1","db"],["s2","db"],["s3","db"]]},
subs:[["Stateless services","Keep sessions in Redis and files in S3, so any instance can serve any request and instances can die freely."],["L4 vs L7 balancing","L4 routes TCP by IP and port, which is fast. L7 reads HTTP, so it can route by path, terminate TLS, and retry."],["REST API design","Nouns for resources, correct status codes, cursor pagination, and idempotency keys so retries are safe."],["API gateway","One front door for auth, rate limiting, routing, and request logging, so services stay focused on business logic."]],
code:"const servers = [{url:'a:3000',up:true},{url:'b:3000',up:true},{url:'c:3000',up:false}];\nlet i = 0;\nfunction pick() {\n  for (let n = 0; n < servers.length; n++) {\n    const s = servers[i++ % servers.length];\n    if (s.up) return s.url;       // skip unhealthy nodes\n  }\n  throw new Error('no healthy servers');\n}",
qa:["Why must services be stateless to scale horizontally?","If state lives in one instance, requests must return to it, which breaks balancing and loses data on failure. Externalizing state to Redis or a database makes instances interchangeable."],
nx:"Next: all those servers share one data layer, which becomes the next bottleneck."},
{t:"Databases and Scaling",why:"Data outlives servers and is the hardest part to scale. Choose storage by access pattern, then scale reads with replicas and writes with shards.",
dg:{t:"Primary-replica replication",n:[["a","App servers",0,1,"s"],["p","Primary",1,0,"d"],["r1","Replica 1",2,1,"d"],["r2","Replica 2",2,2,"d"]],e:[["a","p","writes"],["p","r1","replicate"],["p","r2","replicate"],["a","r1","reads"]]},
subs:[["SQL vs NoSQL","SQL gives joins and ACID transactions. NoSQL gives flexible schemas and easier horizontal scale. Pick by access patterns, and combine them when needed."],["Indexes","B-tree indexes speed reads but slow writes and use memory. Composite indexes follow the leftmost-prefix rule."],["Replication","Replicas add read capacity and failover. Async replication can lag, so read your own writes from the primary."],["Sharding","Split data by a high-cardinality key. Hash gives even spread; range supports scans but risks hot shards. Consistent hashing eases rebalancing."]],
code:"import { createHash } from 'node:crypto';\nconst SHARDS = ['db0', 'db1', 'db2', 'db3'];\nfunction shardFor(userId) {\n  const h = createHash('md5').update(String(userId)).digest().readUInt32BE(0);\n  return SHARDS[h % SHARDS.length];  // one user's rows stay on one shard\n}",
qa:["How would you shard a users table and what can go wrong?","Hash userId to choose a shard so single-user queries hit one node. Risks are hot keys, cross-shard queries and joins, and resharding cost, which consistent hashing and a directory service reduce."],
nx:"Next: even good databases are slow compared with memory, so we add a cache."},
{t:"Caching",why:"Memory is about 50x faster than a database round trip. A cache with a high hit ratio cuts latency and protects the database.",
dg:{t:"Cache-aside flow",n:[["c","Client",0,1,"c"],["a","App",1,1,"s"],["k","Redis cache",2,0,"k"],["d","Database",2,2,"d"]],e:[["c","a"],["a","k","1 check"],["a","d","2 on miss"]]},
ch:{t:"Average latency vs cache hit ratio (cache 1ms, database 50ms)",y:"ms",type:"l",d:[["0%",50],["50%",25.5],["80%",10.8],["90%",5.9],["95%",3.5],["99%",1.5]]},
subs:[["Cache-aside","App checks cache, reads the DB on a miss, then fills the cache with a TTL. Simple and survives cache loss."],["Write-through and write-behind","Write-through keeps cache fresh but slows writes. Write-behind batches writes for speed but can lose data on a crash."],["Eviction and TTL","LRU drops the least recently used key. TTLs bound staleness. Choose per data type, since stale inventory hurts more than stale likes."],["Failure modes","Stampede: many misses at once. Penetration: keys that never exist. Avalanche: mass expiry. Use locks, null caching, and jittered TTLs."]],
code:"async function getProduct(id) {\n  const key = 'p:' + id;\n  const hit = await redis.get(key);\n  if (hit) return JSON.parse(hit);\n  const lock = await redis.set('lock:' + key, '1', 'NX', 'EX', 5);\n  if (!lock) { await sleep(50); return getProduct(id); } // another request rebuilds\n  const row = await db.product(id);\n  await redis.set(key, JSON.stringify(row), 'EX', 300 + Math.floor(Math.random() * 60));\n  return row;\n}",
qa:["How do you prevent a cache stampede?","Take a per-key lock so one request rebuilds the value while others wait, add jitter to TTLs, and refresh popular keys early before they expire."],
nx:"Next: not every task should block the request, so we move slow work to queues."},
{t:"Async Processing and Messaging",why:"Slow or unreliable work (email, video, payments) should not hold the user's request. Queues absorb spikes and let work retry safely.",
dg:{t:"Queue with workers and DLQ",n:[["a","API",0,1,"s"],["q","Queue / Kafka",1,1,"q"],["w1","Worker 1",2,0,"s"],["w2","Worker 2",2,1,"s"],["dq","Dead letter queue",2,2,"q"],["d","Database",3,0,"d"]],e:[["a","q","publish"],["q","w1","consume"],["q","w2","consume"],["q","dq","after retries"],["w1","d"]]},
subs:[["Why queues","Decouple producers from consumers, smooth bursts, and let each side scale and fail independently."],["Kafka basics","Topics split into partitions. Order is guaranteed only within a partition. Consumer groups share partitions for parallelism."],["Delivery semantics","At-least-once is the practical default, so consumers must be idempotent. Exactly-once means at-least-once plus deduplication."],["Retries and DLQ","Retry with backoff, then park poison messages in a dead letter queue and alert on its depth."]],
code:"async function handle(msg) {\n  const first = await redis.set('done:' + msg.id, 1, 'NX', 'EX', 86400);\n  if (!first) return;                       // duplicate delivery, skip\n  try { await sendEmail(msg); }\n  catch (e) {\n    if (msg.attempts >= 3) return queue.publish('email.dlq', msg);\n    await queue.publish('email.retry', { ...msg, attempts: msg.attempts + 1 },\n      { delayMs: 2 ** msg.attempts * 1000 });\n  }\n}",
qa:["How do you avoid processing a message twice?","Assume duplicates will happen. Store a processed message ID atomically, or make the operation naturally idempotent, so redelivery causes no extra effect."],
nx:"Next: with many nodes and copies of data, you must decide how consistent they need to be."},
{t:"Consistency and CAP",why:"Copies of data on many machines can disagree, especially during network failures. You choose which guarantees to keep.",
dg:{t:"Leader replication",n:[["c","Client",0,1,"c"],["l","Leader",1,1,"s"],["f1","Follower 1",2,0,"d"],["f2","Follower 2",2,2,"d"]],e:[["c","l","write"],["l","f1","replicate"],["l","f2","replicate"]]},
subs:[["CAP theorem","During a partition you pick consistency or availability. Banking leans CP; social feeds lean AP."],["Consistency models","Strong sees the latest write. Read-your-writes and causal sit in between. Eventual converges over time and is fastest."],["Quorums","With N replicas, if R + W > N a read overlaps the latest write. Tune R and W to favor reads or writes."],["Consensus","Raft and Paxos elect one leader by majority and agree on an ordered log. Tools like etcd provide this for locks and config."]],
code:"const quorumOk = (N, W, R) => R + W > N;\nconsole.log(quorumOk(3, 2, 2)); // true: reads overlap the latest write\nconsole.log(quorumOk(3, 1, 1)); // false: fast, but a read can be stale",
qa:["When would you choose eventual consistency?","When stale reads are acceptable and availability or latency matters more, such as likes, view counts, and feeds. Avoid it for balances and inventory at checkout."],
nx:"Next: failures will happen anyway, so design how the system behaves when they do."},
{t:"Reliability and Observability",why:"At scale something is always broken. Reliable systems contain failures, degrade gracefully, and make problems visible.",
dg:{t:"Circuit breaker",n:[["c","Caller",0,1,"c"],["b","Circuit breaker",1,1,"l"],["d","Dependency",2,0,"x"],["f","Fallback cache",2,2,"k"]],e:[["c","b"],["b","d","closed"],["b","f","open"]]},
ch:{t:"Downtime per year by availability level",y:"minutes",type:"b",d:[["99%",5256],["99.9%",526],["99.99%",53],["99.999%",5]]},
subs:[["Timeouts, retries, jitter","Always set timeouts. Retry only idempotent calls with exponential backoff and random jitter to avoid retry storms."],["Circuit breaker and bulkhead","Stop calling a failing dependency and fail fast. Separate pools per dependency so one slow service cannot starve the rest."],["Redundancy and failover","Run multiple instances across zones, replicate data, and rehearse failover. Define RPO and RTO for disaster recovery."],["Observability","Structured logs, RED metrics (rate, errors, duration), distributed traces, and alerts based on SLOs and user-visible symptoms."]],
code:"async function retry(fn, tries = 4) {\n  for (let i = 0; ; i++) {\n    try { return await fn(); }\n    catch (e) {\n      if (i >= tries - 1) throw e;\n      await new Promise(r => setTimeout(r, Math.random() * 100 * 2 ** i)); // full jitter\n    }\n  }\n}",
qa:["Why add jitter to retries?","Without jitter, many clients retry at the same moment and overload a recovering service. Randomized delays spread the load so it can recover."],
nx:"Next: put it all together on a real problem, the URL shortener."},
{t:"Case Study: URL Shortener",why:"A classic that exercises every earlier idea: estimation, ID generation, read-heavy caching, and storage.",
dg:{t:"URL shortener architecture",n:[["c","Client",0,1,"c"],["cdn","CDN",1,1,"l"],["a","App servers",2,1,"s"],["k","Redis",3,0,"k"],["d","Postgres",3,1,"d"],["i","ID service",3,2,"s"]],e:[["c","cdn"],["cdn","a"],["a","k","lookup"],["a","d","on miss"],["a","i","new code"]]},
subs:[["Requirements and scale","Create short links, redirect fast, optional expiry. Assume 100M new URLs a month and 100:1 reads, about 40 writes and 4,000 reads per second."],["API design","POST /urls returns a code. GET /:code returns 301 (cacheable) or 302 (trackable) to the long URL."],["ID generation","Base62 of a counter gives short unpredictable-looking codes. Hashing needs collision checks. Range-allocated counters avoid a single hot ID service."],["Scaling the reads","Cache hot codes in Redis, keep a code-to-URL key-value table indexed by code, and shard by code hash if storage grows."]],
code:"const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';\nfunction toBase62(n) {\n  let s = '';\n  do { s = ALPHABET[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);\n  return s;\n}\nconsole.log(toBase62(125)); // '21'; 7 chars cover 62^7, about 3.5 trillion URLs",
qa:["Counter-based vs hash-based short codes?","Counters guarantee uniqueness and are short, but need coordination and can be guessable. Hashes need no coordination but require collision handling and longer codes. Range allocation scales counters well."],
nx:"Next: a second case study that is write-heavy and asynchronous."},
{t:"Case Study: Notification System",why:"Shows queues, fan-out, user preferences, deduplication, and external providers that fail.",
dg:{t:"Notification pipeline",n:[["e","Event or API",0,1,"c"],["n","Notif service",1,1,"s"],["db","Preferences DB",1,2,"d"],["q","Channel queues",2,1,"q"],["p","Push worker",3,0,"s"],["m","Email worker",3,1,"s"],["s","SMS worker",3,2,"s"],["x","FCM / SES / SMS",4,1,"x"]],e:[["e","n"],["n","db","prefs"],["n","q","publish"],["q","p"],["q","m"],["q","s"],["p","x"],["m","x"],["s","x"]]},
subs:[["Requirements","Multiple channels, user preferences, rate limits per user, scheduled sends, delivery tracking, and no duplicates."],["Fan-out with queues","One queue per channel lets workers scale and fail independently, and slow SMS does not block push."],["Reliability","Retry with backoff, fall back to another provider, and use a DLQ. Dedupe with an ID like eventId:channel."],["Protecting users","Rate limit and batch notifications, honor quiet hours, and let users opt out per channel."]],
code:"async function notify(userId, event) {\n  const prefs = await getPrefs(userId);\n  for (const ch of ['push', 'email', 'sms'].filter(c => prefs[c])) {\n    await queue.publish('notif.' + ch, {\n      id: event.id + ':' + ch, userId, body: event.body   // id enables dedupe\n    });\n  }\n}",
qa:["How do you ensure a notification is not sent twice?","Give each notification a deterministic ID, store it atomically before sending, and make workers idempotent, since queues deliver at least once."],
nx:"Last stop: how to present all of this under interview pressure."},
{t:"Interview Playbook",why:"Knowing the pieces is half the job. A repeatable structure shows seniority.",
subs:[["Time split (45 min)","5 requirements, 5 estimation and APIs, 15 high-level design, 15 deep dive, 5 trade-offs and wrap-up."],["Talk through trade-offs","Say what you chose, what you gave up, and when you would choose differently. Interviewers score reasoning, not a perfect answer."],["Common mistakes","Jumping to tools, skipping requirements, ignoring failure modes, over-engineering, and never quantifying scale."],["Practice order","URL shortener, rate limiter, notification system, chat, news feed, then payments. Redo each one aloud on a timer."]],
qa:["How do you handle an ambiguous problem?","Ask clarifying questions, write down functional and non-functional requirements, state assumptions explicitly, and confirm them before designing."],nx:""}
];

export const Q = [
{id:"parking-lot",cat:"Backend",lv:"Medium",t:"Design a Parking Lot (LLD)",intro:"Model entities, relationships, and pricing so new vehicle types or rules never force a rewrite.",
req:["Multiple floors with bike, compact, and large spots","Issue a ticket at entry and compute the fee at exit","Show availability and support several payment types","New vehicle types and pricing rules must be easy to add"],
flow:["Entry gate","Find spot","Issue ticket","Park","Exit gate","Price and pay","Free spot"],
steps:[["Identify entities","ParkingLot has Floors, Floors have Spots. A Spot has a type and a free flag. A Vehicle has a type. A Ticket links vehicle, spot, and entry time. Payment settles a ticket."],["Allocation strategy","A SpotStrategy decides which free spot to pick (nearest entrance, lowest floor). Swap strategies without touching ParkingLot, which is the open/closed principle."],["Pricing strategy","PricingStrategy computes the fee from duration and vehicle type: hourly, flat, or peak. Keeping it separate from Ticket makes it testable."],["Concurrency","Two gates must never hand out the same spot. A single Node process is naturally atomic; across servers use a DB row lock or Redis SET NX on the spot id."],["Extensibility","A new vehicle type is a new enum value plus a compatibility rule. EV charging becomes a capability flag on Spot, not a rewrite."]],
tr:["A linear scan is O(spots); keep a free list per spot type for O(1) allocation.","Strategy classes add files but make rules swappable and unit-testable."],
fu:["How would you scale to 500 lots? (a lot service per site, shared ticket DB)","How do you handle a lost ticket? (plate recognition or maximum daily fee)","How would you add reservations? (hold a spot with a TTL)"]},
{id:"rate-limiter",cat:"Backend",lv:"Medium",t:"Design a Rate Limiter",intro:"Asked both as an algorithm question and as a distributed system question; be ready for either.",
req:["Limit per user or API key, for example 100 requests a minute","Under 5 ms of added latency","Consistent across many app servers","Return 429 with a Retry-After header"],
flow:["Request","Gateway","Redis counter","Allow or 429","Service"],
steps:[["Token bucket","A bucket holds up to N tokens refilled at r per second; each request spends one. It allows bursts while keeping the average rate, with O(1) state per key."],["Sliding window","A fixed window is cheap but lets 2x bursts through at window edges. A sliding window counter blends the current and previous windows for accuracy with small memory."],["Distributed state","Keep counters in Redis and do the read-modify-write in one Lua script, so servers cannot race each other."],["Failure policy","If Redis is down, fail open for ordinary APIs to protect availability, or fail closed for costly or sensitive ones. A local in-memory limiter makes a decent fallback."],["Placement and UX","Apply global limits at the gateway and special limits per endpoint. Return X-RateLimit-Remaining so clients can back off politely."]],
tr:["Token bucket is burst-friendly with tiny state; sliding window is stricter but uses more memory.","A central Redis is accurate but becomes a dependency; local limiters are fast but approximate."],
fu:["Per-IP versus per-user limits, and what about shared NATs?","How do you handle 1M distinct keys? (TTLs, shard Redis by key)","How do you avoid clock skew between servers? (use Redis TIME)"]},
{id:"movie-booking",cat:"Backend",lv:"Medium",t:"Design Movie Ticket Booking",intro:"The core test is concurrency: two people must never buy the same seat.",
req:["Browse shows and seat maps","Hold seats for 5 minutes while the user pays","No double booking, ever","Release seats if payment fails or time runs out"],
flow:["Select seats","Hold with TTL","Pay","Confirm","Release on expiry"],
steps:[["Data model","shows(id, movie, screen, time), seats(show_id, seat_no, status, held_until), bookings(id, user, show_id, seats, status). Seat status is available, held, or booked."],["Hold seats atomically","Run one conditional UPDATE that only changes seats still available (or whose hold expired). If affected rows differ from the requested count, roll back."],["Why it is safe","The database applies the conditional update atomically, so exactly one transaction wins each seat. No application-level lock is needed."],["Confirm and expire","After payment success mark the seats booked. A background job or Redis key expiry frees held seats whose time ran out."],["Hot shows","For big releases, put users in a virtual waiting room, cache seat maps, and keep all writes on the primary database."]],
tr:["SELECT FOR UPDATE is simple but holds locks longer; the conditional update is lighter.","Redis holds are fast, but the database must remain the source of truth."],
fu:["What if payment succeeds after the hold expires?","Seat-level versus show-level locking?","How do you survive a launch-day thundering herd?"]},
{id:"typeahead",cat:"Frontend",lv:"Medium",t:"Build an Autocomplete (Typeahead)",intro:"A frontend classic that tests debouncing, race conditions, caching, and accessibility.",
req:["Suggestions appear as the user types","No wasted or out-of-order requests","Full keyboard and screen reader support","Loading, empty, and error states"],
flow:["Keystroke","Debounce 250ms","Cache lookup","Abortable fetch","Render list","Select"],
steps:[["Debounce","Wait until typing pauses for 200 to 300 ms before calling the API. This commonly removes most requests."],["Race conditions","Slow responses can arrive out of order. Abort the previous request with AbortController, or ignore results whose query no longer matches the input."],["Client cache","Keep a capped Map from query to results so backspacing is instant. Add a TTL to avoid stale suggestions."],["Accessibility","Use role=combobox with aria-expanded and aria-activedescendant, and listbox/option roles. Support arrows, Enter, and Escape."],["Backend side","Serve prefixes from a trie or Elasticsearch with top-K by popularity, and cache common prefixes at the CDN."]],
tr:["A longer debounce saves requests but feels laggy; 200 to 300 ms is typical.","A client cache speeds the UI but risks stale data, so add a TTL."],
fu:["How do you highlight matched text safely without innerHTML?","What happens on a slow or offline network?","How would you rank suggestions?"]},
{id:"infinite-feed",cat:"Frontend",lv:"Medium",t:"Build an Infinite Scroll Feed",intro:"Tests performance thinking: pagination, virtualization, and state for very long lists.",
req:["Load more as the user nears the bottom","Smooth scrolling with thousands of items","Restore scroll position on back navigation","Loading, error, and end-of-list states"],
flow:["Sentinel visible","Fetch next page","Append items","Virtualize DOM","Cache and restore"],
steps:[["Trigger with IntersectionObserver","Observe a sentinel element near the list end instead of listening to scroll events. It is cheaper and does not run on every scroll tick."],["Cursor pagination","Request ?cursor=lastId&limit=20. Cursors stay correct when new posts arrive, whereas page numbers duplicate or skip items."],["Virtualization","Render only visible rows plus a buffer using react-window or TanStack Virtual. This keeps the DOM near 30 nodes even for 10,000 items."],["State and caching","Use React Query or SWR infinite queries to cache pages, dedupe requests, and restore position on return."],["Polish","Skeleton loaders, lazy images with width and height set to avoid layout shift, and a retry button on failure."]],
tr:["Virtualization breaks Ctrl+F and needs row sizing, but is essential beyond a few hundred items.","A larger rootMargin prefetches earlier and feels faster, at the cost of extra data."],
fu:["How do you show a 'new posts' banner at the top?","How do you stop memory growing in a long session?","How do you handle SEO for feed pages?"]},
{id:"chat",cat:"Full-stack",lv:"Hard",t:"Design a Real-Time Chat App",intro:"A full-stack favorite: WebSockets and optimistic UI on the client, fan-out and storage on the server.",
req:["1:1 and group messaging in real time","Delivery and read receipts","Offline users receive messages later","Paginated message history"],
flow:["React client","WebSocket gateway","Redis pub/sub","Recipient gateway","Recipient","MongoDB history"],
steps:[["Connection layer","Each client keeps a WebSocket to any gateway node behind a load balancer. A Redis map of user to gateway tells the system where to route a message."],["Message flow","The sender emits a message with a client-generated ID. The server persists it, acks the sender, then publishes to the recipient's channel in Redis. Their gateway pushes it down the socket."],["Offline delivery","With no socket, keep the message in the inbox and send a push notification. On reconnect the client sends its last seen ID and the server replays what was missed."],["Storage","MongoDB indexed by conversationId and timestamp, loaded by cursor. Group messages are stored once and fanned out per member on delivery."],["Frontend","Optimistic UI shows the message instantly as sending, then reconciles on ack using the client ID. Reconnect with exponential backoff and dedupe by ID."]],
tr:["WebSockets give low latency but are stateful and harder to scale than HTTP polling.","Redis pub/sub is fire and forget; Kafka adds durability and replay with more complexity."],
fu:["How do you guarantee message ordering?","How would you build presence and typing indicators at scale?","How would end-to-end encryption change the design?"]},
{id:"news-feed",cat:"Full-stack",lv:"Hard",t:"Design a News Feed (Twitter or Instagram)",intro:"The key decision is fan-out on write versus fan-out on read, and how a React UI consumes the result.",
req:["Users follow others and see a ranked feed","Feed loads in under 200 ms","New posts appear within seconds","Celebrity accounts with millions of followers"],
flow:["Post created","Fan-out workers","Follower feed lists in Redis","Feed API merges","React infinite list"],
steps:[["Fan-out on write","When someone posts, push the post ID into each follower's Redis list. Reads become one fast lookup, but writes explode for accounts with huge followings."],["Fan-out on read","Store posts by author only and merge recent posts from everyone you follow at read time. Writes are cheap and reads are slow."],["Hybrid approach","Use fan-out on write for normal users. For celebrities skip it and merge their latest posts into the feed at read time."],["Storage","Posts by author and time, a follow graph, a capped feed list of post IDs per user in Redis (about 800), and bulk hydration of IDs into post bodies from cache."],["Frontend","Cursor-paginated infinite scroll, optimistic likes and posts, and a 'new posts' banner driven by polling or server-sent events."]],
tr:["Write fan-out costs storage and time but makes reads fast; read fan-out is the opposite.","Ranking models improve relevance but add latency, so precompute scores where possible."],
fu:["How would you rank posts?","How do you handle unfollows and deleted posts?","How do you cache viral posts?"]}
];

export const QX = {
"parking-lot":{ap:["Clarify|Vehicle types, floors, pricing rules, and whether this is LLD (classes) or HLD.","List the nouns|Lot, Floor, Spot, Vehicle, Ticket, and Payment become classes.","Sketch methods|park(), exit(), fee(), and how objects relate, before any code.","Extract variation|Spot choice and pricing become strategies; name SOLID aloud.","Walk a scenario|Trace one entry and exit, then cover concurrency and extensions."]},
"rate-limiter":{ap:["Clarify|Limit per user, IP, or key? Hard or soft? One node or distributed?","Pick an algorithm|Token bucket for bursts, sliding window for strictness.","Place the state|Redis shared by all servers keeps limits consistent.","Make it atomic|One Lua script avoids races between servers.","Failure and UX|Fail open or closed, and return 429 with Retry-After."]},
"movie-booking":{ap:["Clarify|Seat selection, hold time, payment, and the no double booking rule.","Model seat states|available, held, booked, plus a held_until timestamp.","Prevent double booking|One conditional UPDATE decides the winner atomically.","Handle expiry|Release holds by job or TTL when payment never arrives.","Scale launches|Waiting room, cached seat maps, and writes on the primary."]},
"typeahead":{ap:["Clarify|Data source, result count, keyboard support, and mobile behavior.","Stabilize input|Debounce keystrokes before calling the API.","Fix races|Abort stale requests so old results never overwrite new ones.","Add caching|A Map of query to results with a TTL gives instant backspacing.","Accessibility and backend|ARIA combobox roles, then a prefix index with CDN caching."]},
"infinite-feed":{ap:["Clarify|Page size, ordering, item height, and back-navigation behavior.","Choose the trigger|IntersectionObserver on a sentinel near the end.","Use cursors|Cursor pagination stays correct as new items arrive.","Control the DOM|Virtualize rows so rendering stays cheap.","Handle states|Skeletons, errors with retry, end of list, restored scroll."]},
"chat":{ap:["Clarify|1:1 or groups, receipts, offline delivery, and connection scale.","Pick the transport|WebSockets for real time, push notifications when offline.","Route messages|Redis pub/sub or Kafka between gateway nodes.","Persist and ack|Store first, ack the sender, then deliver; dedupe by client ID.","Cover edge cases|Ordering, reconnect replay, presence, and encryption."]},
"news-feed":{ap:["Clarify|Follow graph size, ranking, freshness, and celebrity accounts.","Compare fan-out|Write fan-out reads fast; read fan-out writes cheap.","Choose hybrid|Push for normal users, merge celebrity posts at read time.","Define storage|Posts, follow graph, capped Redis feed of IDs, hydrate on read.","Design the client|Cursor scroll, optimistic actions, and a new posts banner."]}
};

// Deep dives. c = [title, explanation, code] cards. The Mermaid diagrams are described in docs/plan/05-deep-dives.md.
export const DD = [
{t:"Caching Techniques",why:"A cache trades freshness and memory for speed. The technique you choose decides what happens when the cache is stale, cold, or down.",
c:[["Cache-aside (lazy loading)","The app checks the cache, loads from the database on a miss, then stores the result with a TTL. The safest default: if the cache dies you only get slower.",`const hit = await redis.get(key);
if (hit) return JSON.parse(hit);
const row = await db.find(id);
await redis.set(key, JSON.stringify(row), 'EX', 300);
return row;`],
["Write-through","Every write goes to the database and the cache together, so reads are always fresh. Writes cost double and rarely read data wastes memory.",`async function save(id, data) {
  await db.save(id, data);
  await redis.set('item:' + id, JSON.stringify(data), 'EX', 3600);
}`],
["Write-behind (write-back)","Write to the cache now and flush to the database later in batches. Very fast writes, but a crash can lose unflushed data.","(see the fixed version in docs/plan/05-deep-dives.md §1)"],
["Invalidation","Delete the key on write, keep a TTL as a safety net, or put a version in the key so old entries are simply never read. State the staleness you accept.",`await db.update(id, data);
await redis.del('item:' + id);                  // delete, do not update
const key = 'user:' + id + ':v' + user.version;  // versioned key`],
["Stampede protection","When a hot key expires, thousands of requests hit the database. Let one request rebuild while the others share its promise.",`const inflight = new Map();
function load(key, fn) {
  if (!inflight.has(key))
    inflight.set(key, fn().finally(() => inflight.delete(key)));
  return inflight.get(key);
}`]],nx:"When one database can no longer hold or serve all the data, you shard it."},
{t:"Sharding Strategies",why:"Sharding splits data across machines so no single database limits storage or write throughput. The shard key you pick is the most important decision.",
c:[["Hash sharding","Hash the key and take it modulo N. Even spread, but range queries touch every shard and changing N moves almost every key.",`const shardFor = id => hash(String(id)) % SHARDS.length;
const db = pools[shardFor(userId)];`],
["Range sharding","Each shard owns a key range. Great for scans and time ranges, but sequential keys such as timestamps send every write to the newest shard.",`const ranges = [{max:1e6,db:'db0'},{max:2e6,db:'db1'},{max:Infinity,db:'db2'}];
const shardFor = id => ranges.find(r => id < r.max).db;`],
["Directory (lookup) sharding","A lookup table maps each tenant to a shard, so you can move one huge tenant alone. It costs an extra lookup that you cache.",`const shard = await redis.hget('shard-map', tenantId)
  ?? await directory.lookup(tenantId);`],
["Consistent hashing","Nodes sit on a ring with many virtual points each. Adding a node moves only about 1/N of the keys and virtual nodes even out the load.","(replaced by the binary-search HashRing in docs/plan/05-deep-dives.md §2)"],
["Online resharding","Never stop the world. Add new shards, dual-write, backfill old data, verify counts, switch reads, then stop writing to the old shard.",`await Promise.all([oldShard.write(row), newShard.write(row)]); // dual-write
// backfill in background, compare checksums, flip reads, delete old data`]],nx:"Next: choosing the right store for each kind of data."},
{t:"Storing Data: Choosing the Right Store",why:"No single database is best at everything. Match each kind of data to the store whose strengths fit its access pattern, and keep one source of truth per fact.",
c:[["Relational (PostgreSQL)","Use for money, orders, and users: constraints and ACID transactions. Index what you filter and sort by.","(replaced by the fixed version in docs/plan/05-deep-dives.md §3)"],
["Document (MongoDB)","Use for flexible entities read together, like catalogs and profiles. Embed bounded children and reference unbounded ones.",`await db.collection('orders').insertOne({
  userId, status: 'paid',
  items: [{ sku: 'a1', qty: 2, price: 499 }]   // embedded line items
});`],
["Key-value (Redis, DynamoDB)","Use for sessions, counters, and single-key lookups at very high speed. Model around access patterns because there are no joins.",`await redis.set('session:' + id, JSON.stringify(sess), 'EX', 1800);
await redis.incr('views:' + postId);`],
["Object storage (S3)","Keep files and media here, never in the database. Store only the key in your DB and let clients upload directly with presigned URLs.",`const url = await getSignedUrl(s3,
  new PutObjectCommand({ Bucket, Key: 'u/' + id + '.jpg' }), { expiresIn: 300 });
// client PUTs the file to url; save Key in the database`],
["Search and time-series","Elasticsearch gives full-text search; ClickHouse or Timescale handle metrics and events. Feed them from the main DB through events and never treat them as the source of truth.",`await queue.publish('product.updated', { id, name, price });
// indexer consumes it: es.index({ index: 'products', id, document: { name, price } })`]],nx:"Next: how data reaches the client in real time."},
{t:"Polling, SSE and WebSockets",why:"HTTP is request and response, but users expect live updates. Each technique trades simplicity against latency and server cost.",
c:[["Short polling","The client asks every few seconds. Trivial and universal, but most requests return nothing and updates arrive late.","(see docs/plan/05-deep-dives.md §4)"],
["Long polling","The server holds the request open until data exists or a timeout, then the client asks again at once. Near real time over plain HTTP.","(fixed version in docs/plan/05-deep-dives.md §4)"],
["Server-Sent Events","One long-lived HTTP response streams events in one direction, with automatic reconnect. Ideal for feeds, scores, and progress bars.","(extended version in docs/plan/05-deep-dives.md §4)"],
["WebSockets","A persistent two-way channel for chat, games, and collaboration. Needs heartbeats, reconnect logic, and a pub/sub backplane to scale past one server.",`wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => ws.isAlive = true);
  ws.on('message', m => broadcast(m));
});
setInterval(() => wss.clients.forEach(c => c.isAlive ? (c.isAlive = false, c.ping()) : c.terminate()), 30000);`],
["Webhooks","Between servers, the provider calls you when something happens instead of you polling. Verify signatures, acknowledge fast, and process asynchronously and idempotently.","(HMAC version in docs/plan/05-deep-dives.md §4)"]],nx:"Rule of thumb: dashboards poll, notifications use SSE, chat uses WebSockets, provider events use webhooks."},
{t:"Connections: Pooling, Keep-Alive and Limits",why:"Connections are expensive and limited. Most production outages from load come from exhausted pools, missing timeouts, or unbounded concurrency.",
c:[["Database connection pooling","Opening a connection costs tens of milliseconds and databases cap them. A pool reuses a few; size it from the DB limit divided by instance count.",`const pool = new Pool({ max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 });
const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);`],
["HTTP keep-alive","Reusing TCP and TLS connections avoids repeated handshakes to downstream services. Configure an agent for service-to-service calls.","(updated undici version in docs/plan/05-deep-dives.md §5)"],
["Timeouts and deadlines","Every outgoing call needs a timeout, or one slow dependency ties up all your sockets. Pass a shared deadline downstream.",`const res = await fetch(url, { signal: AbortSignal.timeout(2000) });`],
["Limiting concurrency","Unbounded Promise.all can flood a database or API. Process work with a fixed number of workers to protect dependencies.",`async function mapLimit(items, limit, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const n = i++; out[n] = await fn(items[n]); }
  }));
  return out;
}`],
["Scaling persistent connections","One Node process can hold tens of thousands of idle sockets, limited by memory and file descriptors. Use a pub/sub backplane and drain connections gracefully on deploy.",`process.on('SIGTERM', () => {
  wss.clients.forEach(c => c.close(1001, 'restarting'));   // clients reconnect elsewhere
  server.close(() => process.exit(0));
});`]],nx:"Finally, see how reads, writes, async work, and failures flow end to end."},
{t:"Request Flows End to End",why:"Interviewers want to hear the path a request takes. Know the read, write, async, and failure flows and what each layer contributes.",
c:[["Read path","CDN first, then cache, then database. Each layer absorbs traffic so the database sees a small fraction of requests.",`app.get('/products/:id', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');   // CDN and browser
  res.json(await getProduct(req.params.id));        // Redis, then DB
});`],
["Write path","Validate, write the source of truth in a transaction, record an outbox event, respond, and let consumers update caches and indexes.",`await db.tx(async t => {
  await t.none('INSERT INTO orders(id,total) VALUES($1,$2)', [id, total]);
  await t.none('INSERT INTO outbox(topic,payload) VALUES($1,$2)', ['order.created', payload]);
});
res.status(201).json({ id });`],
["Async path","Slow work leaves the request: publish a job, return 202, and let workers process it with retries and a dead letter queue.",`app.post('/reports', async (req, res) => {
  const jobId = await queue.publish('report', req.body);
  res.status(202).json({ jobId, statusUrl: '/reports/' + jobId });
});`],
["Failure path","Timeouts, retries with jitter, a circuit breaker, and a fallback stop a dependency outage from becoming your outage.",`try { return await withTimeout(recommend(userId), 300); }
catch { return popularFromCache(); }   // degrade gracefully`],
["Idempotent retries","Clients retry on timeouts, so writes need an idempotency key: store the key with the result and return the stored result on repeats.","(race-free version in docs/plan/05-deep-dives.md §6)"]],nx:""}
];
