import type { Short } from "./types";

// Building blocks: networking, APIs, security, data processing and operations. See building-blocks.ts for the format.
export const shorts: Short[] = [
  // ── Networking ─────────────────────────────────────────────────────────────
  {
    id: "tcp-vs-udp",
    track: "Building blocks",
    topic: "TCP vs UDP",
    title: "TCP never loses a byte; UDP never waits for one",
    hook: "Almost every protocol you'll name sits on one of these two, and the choice decides what a single lost packet costs you.",
    points: [
      "**TCP** is an ordered, reliable byte stream: it numbers every byte, tracks acknowledgements and retransmits anything lost.",
      "You pay a **handshake** (1 round trip) before any data, and congestion control slows the sender when packets drop.",
      "**Head-of-line blocking**: one lost packet holds back every byte behind it until the retransmit arrives, at least a round trip later.",
      "**UDP** sends independent datagrams: no connection, no order, no retransmits. Just ports, a length and a checksum in 8 bytes.",
      "Use TCP when every byte matters (APIs, payments, databases) and UDP when late is as bad as lost (games, voice, live video).",
    ],
    more: [
      {
        title: "Where UDP fits",
        points: [
          "**Voice and video calls**: a retransmitted frame would arrive too late to play, so the app skips it and hides the gap.",
          "**Games** send state many times a second. The next update replaces a lost one, so waiting for a retransmit is pointless.",
          "**DNS** fits a query and its answer in one datagram each: one round trip, no handshake. Large answers fall back to TCP.",
          "**QUIC**, under HTTP/3, builds reliable, encrypted streams on top of UDP, so a lost packet stalls only its own stream.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "UDP has **no congestion control**. The app must pace itself, or it floods the link and loses even more.",
          "Need some reliability over UDP? You rebuild acks and retransmits yourself, only for the messages that need them.",
          "Some networks block or throttle UDP, so UDP protocols need a TCP fallback: browsers drop from HTTP/3 to HTTP/2.",
        ],
      },
    ],
    say: "For the payments API I'd use TCP, through HTTPS, because every byte must arrive in order. For live voice I'd use UDP: a late packet is useless, so the client skips it rather than stalling for a retransmit.",
    source: "/deep-dives/connections-pooling#what-each-connection-costs",
  },
  {
    id: "http-versions",
    track: "Building blocks",
    topic: "HTTP versions",
    title: "Each HTTP version removes the bottleneck the last one left behind",
    hook: "The version you serve decides how many connections a page needs and what one lost packet costs every request on them.",
    points: [
      "**HTTP/1.1** handles one request at a time per connection, so browsers open about **6 connections** per origin.",
      "**HTTP/2** multiplexes many streams over one TCP connection and compresses repeated headers with **HPACK**.",
      "But TCP delivers bytes in order, so one lost packet stalls **every stream** on it: head-of-line blocking moves down a layer.",
      "**HTTP/3** runs over **QUIC** on UDP. Each stream recovers its own losses, so a dropped packet stalls only that stream.",
      "QUIC combines the transport and TLS 1.3 handshakes into **1 round trip**, and a resumed connection can send data in 0-RTT.",
    ],
    more: [
      {
        title: "What HTTP/3 adds",
        points: [
          "**Connection migration**: a connection has its own ID, not just an IP and port, so it survives a switch from Wi-Fi to mobile.",
          "Encryption is mandatory: QUIC always uses TLS 1.3 and also encrypts packet numbers and acks, which TCP sends in the clear.",
          "Browsers learn a server speaks HTTP/3 from the `Alt-Svc` header or a DNS `HTTPS` record, and fall back to HTTP/2 if UDP fails.",
        ],
      },
      {
        title: "Trade-offs",
        points: [
          "On a clean wired network HTTP/2 and HTTP/3 perform about the same. HTTP/3 wins on lossy mobile links and on first connect.",
          "QUIC runs in user space, not the kernel, so it typically costs servers more CPU per byte than TCP.",
          "**0-RTT** data can be replayed by an attacker, so servers should accept only safe, idempotent requests like `GET` in it.",
          "**Domain sharding**, an HTTP/1.1 trick for more connections, hurts under HTTP/2: it splits one multiplexed connection into several.",
        ],
      },
    ],
    say: "I'd serve HTTP/2 and HTTP/3 at the edge: mobile users on lossy networks gain most from QUIC's independent streams and connection migration, and browsers fall back to HTTP/2 when UDP is blocked.",
    source: "/deep-dives/connections-pooling#http2-multiplexing-and-http3",
  },
  {
    id: "dns-anycast-geodns",
    track: "Building blocks",
    topic: "DNS",
    title: "DNS is the first load balancer every request passes through",
    hook: "Before your servers see a byte, DNS has picked the region, and its TTL decides how quickly you can move users off a failure.",
    points: [
      "The OS's **stub resolver** asks a **recursive resolver** (the ISP's, or a public one like 1.1.1.1) to do the work.",
      "On a cold cache, the recursive resolver asks a **root** server, then the `.com` TLD server, then the domain's authoritative server.",
      "Every answer carries a **TTL**. Resolvers, OSes and browsers reuse it until it expires, so most lookups never leave a cache.",
      "**GeoDNS**: the authoritative server answers with a different IP by location, sending each user to the nearest healthy region.",
      "**Anycast**: many sites announce the same IP over BGP, and routing sends each user to the closest one in network terms.",
    ],
    more: [
      {
        title: "TTL trade-offs",
        points: [
          "A **low TTL** (30–60 s) lets you fail over a region in about a minute, at the cost of more lookups and more DNS load.",
          "A **high TTL** (hours) makes lookups nearly free, but a wrong record lingers in caches until it expires.",
          "Some resolvers and clients cache longer than the TTL, so never rely on DNS alone for instant failover.",
          "Lower the TTL well before a planned move: caches can hold the old record for as long as the old TTL.",
        ],
      },
      {
        title: "GeoDNS vs anycast",
        points: [
          "GeoDNS sees the **resolver's** location, not the user's, unless it sends EDNS Client Subnet, so a far-off resolver can pick the wrong region.",
          "Anycast fails over by routing: a broken site withdraws its route and traffic moves elsewhere, with no TTL to wait out.",
          "Root servers, public resolvers and CDNs all use anycast: the 13 root server names answer from well over 1,000 sites.",
        ],
      },
    ],
    say: "I'd put GeoDNS with health checks in front of two regions, with a 60-second TTL so failover takes about a minute, and use an anycast CDN at the edge so routing, not DNS, picks the nearest site.",
    source: "/learn/api-load-balancing#the-request-path",
  },
  {
    id: "cdn-pull-vs-push",
    track: "Building blocks",
    topic: "CDN",
    title: "Pull CDNs fill on the first request; push CDNs fill before it",
    hook: "A CDN turns a long trip to your origin into a 10–30 ms hop to the edge, but only for what it may cache and knows is fresh.",
    points: [
      "**Pull**: on a miss the edge fetches from your origin, caches the response and serves everyone after. Almost no setup.",
      "**Push**: you upload files to the CDN ahead of time. Suits big, rarely changing files like video; you manage what's stored.",
      "The **cache key** is usually host plus URL. Add headers or cookies only when the response truly varies on them, or hits collapse.",
      "Your origin sets freshness with `Cache-Control`: `s-maxage` for shared caches, `private` to keep per-user data off the edge.",
    ],
    more: [
      {
        title: "Invalidation",
        points: [
          "**Versioned file names** (`app.3f9a1c.js`) never need purging: a new build is a new URL, so cache them a year with `immutable`.",
          "Give HTML a short TTL. It changes in place and points at the versioned assets.",
          "A **purge** removes an object from every edge, but the next requests all miss at once and land on your origin.",
          "An **origin shield** adds a regional cache tier between the edges and your origin, so many edge misses become far fewer origin requests.",
        ],
      },
      {
        title: "Private content",
        points: [
          "**Signed URLs** carry an expiry and a signature the edge checks itself, so it serves private files without calling your app.",
          "Keep signed URLs short-lived (minutes): anyone holding the link can use it until it expires.",
          "Never cache per-user responses as public, or the next user gets someone else's page. Mark them `private` or bypass the CDN.",
        ],
      },
    ],
    code: `const crypto = require("node:crypto");
// Sign path + expiry; the edge recomputes the HMAC with the same key
function signUrl(path, key, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto.createHmac("sha256", key)
    .update(\`\${path}:\${exp}\`).digest("base64url");
  return \`\${path}?exp=\${exp}&sig=\${sig}\`;
}
signUrl("/videos/42.mp4", key, 300); // valid for 5 minutes`,
    say: "Static assets get content-hashed names and a one-year immutable max-age on a pull CDN, HTML gets a short TTL, and private videos go out through signed URLs that expire in minutes.",
    source: "/learn/caching#http-caching-for-frontend-developers",
  },

  // ── APIs and security ──────────────────────────────────────────────────────
  {
    id: "rest-grpc-graphql",
    track: "Building blocks",
    topic: "API styles",
    title: "REST for the public, gRPC between services, GraphQL for many clients",
    hook: "Interviewers want an API style picked per boundary, with its cost named, not one style declared the winner.",
    points: [
      "**REST** models resources with URLs and HTTP verbs. `GET`s cache in browsers and CDNs, and every tool and language speaks it.",
      "**gRPC** sends Protobuf over HTTP/2: typed contracts, generated clients, compact binary messages and streaming both ways.",
      "**GraphQL** serves one typed schema at one endpoint. The client asks for exactly the fields a screen needs, in one round trip.",
      "Many systems use all three: GraphQL as a BFF for the apps, calling services over gRPC, with REST for partners.",
    ],
    more: [
      {
        title: "What each costs",
        points: [
          "REST **over- and under-fetches**: a screen may need three calls, or get 40 fields to use 4.",
          "gRPC isn't native in browsers: it needs **gRPC-Web** and a proxy. Binary payloads are also harder to inspect with curl.",
          "GraphQL usually `POST`s every query to one URL, so plain HTTP caching doesn't apply. Persisted queries sent as `GET` restore it.",
        ],
      },
      {
        title: "GraphQL pitfalls",
        points: [
          "**N+1 resolvers**: 50 posts call the author resolver 50 times. Batch those lookups per request with a **DataLoader**.",
          "A client can send a deeply nested query that fans out to millions of rows. Enforce **depth and cost limits**.",
          "Errors usually come back as `200` with an `errors` array, so alert on the response body, not just status codes.",
        ],
      },
      {
        title: "gRPC tips",
        points: [
          "Evolve Protobuf schemas safely: add fields with new numbers, and never reuse or renumber an old one.",
          "Set a **deadline** on every call and pass it on to downstream calls, so the whole chain gives up together.",
        ],
      },
    ],
    say: "I'd expose REST to third parties for its simplicity and HTTP caching, use gRPC between internal services for typed contracts and streaming, and add GraphQL as a BFF only if web and mobile need very different data.",
    source: "/learn/api-load-balancing#api-styles-compared",
  },
  {
    id: "jwt-vs-sessions",
    track: "Building blocks",
    topic: "JWT vs sessions",
    title: "A JWT is easy to issue and hard to take back",
    hook: "Sessions and tokens both keep users logged in. Where the truth lives decides how fast you can log someone out.",
    points: [
      "A **session** is a random, opaque id in a cookie. The server looks it up in a store such as Redis on every request.",
      "Logging out or banning a user is one delete, effective on the next request. The price is a **lookup** per request.",
      "A **JWT** carries signed claims (user id, roles, expiry). Any service with the key checks it locally, with no lookup.",
      "A stolen JWT stays valid **until it expires**, so keep access tokens short-lived: minutes, not days.",
      "It's **signed, not encrypted**: anyone can base64-decode the payload, so never put secrets in it.",
    ],
    more: [
      {
        title: "Refresh tokens",
        points: [
          "Pair a short access token with a long-lived **refresh token** checked against a store, so a ban takes effect within minutes.",
          "**Rotate** the refresh token on every use. If an old one is replayed, it was stolen: revoke the whole chain.",
          "Need instant revocation? A denylist of token ids (`jti`) kept until they expire works, but brings back the lookup.",
        ],
      },
      {
        title: "Where to keep tokens",
        points: [
          "In an `HttpOnly`, `Secure` cookie: page scripts can't read it, so an XSS bug can't copy the token out.",
          "Not in `localStorage`: any script on the page can read it, so one XSS hole leaks every token.",
          "Cookies travel automatically, so defend against CSRF: `SameSite=Lax` or `Strict`, plus CSRF tokens on risky forms.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Pin the algorithm when verifying. Accepting `alg: none`, or letting the header switch RS256 to HS256, are classic JWT bugs.",
          "With many verifying services, sign with a private key (RS256, ES256) so they only ever hold the public key.",
        ],
      },
    ],
    code: `// A JWT is three base64url parts: header.payload.signature
const [, payload] = token.split(".");
JSON.parse(Buffer.from(payload, "base64url").toString());
// { sub: "42", role: "admin", exp: 1767225600 }
// Anyone can read this; the signature only stops changes`,
    say: "For one web app I'd use server-side sessions in Redis, since logout is instant. Across many services I'd use short-lived JWTs checked locally, plus refresh tokens checked against a store so revocation still works.",
    source: "/learn/api-load-balancing#stateless-services",
  },
  {
    id: "oauth-pkce",
    track: "Building blocks",
    topic: "OAuth",
    title: "OAuth lets an app act for you without ever seeing your password",
    hook: "\"Connect your calendar\" and \"Log in with Google\" both run on OAuth. Get the flow wrong and an intercepted code hands over the user's tokens.",
    points: [
      "OAuth 2.0 is **delegated authorisation**: the user approves **scopes**, like `calendar.read`, and the app gets a token limited to them.",
      "**Authorisation code flow**: the app redirects to the provider, the user consents, and the provider redirects back with a one-time code.",
      "The app swaps that code for tokens. **PKCE** proves the app swapping it is the same one that started the flow.",
      "PKCE: send a hash of a random **verifier** first, then the verifier itself with the code. A stolen code is useless without it.",
    ],
    more: [
      {
        title: "The tokens",
        points: [
          "An **access token** is short-lived and sent to APIs. A **refresh token** is long-lived and only goes to the authorisation server.",
          "**OpenID Connect** adds login on top: an **ID token**, a signed JWT that tells the app who the user is.",
          "Don't send the ID token to APIs as a credential; that's what the access token is for.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Never use the **implicit flow**: it returns tokens in the redirect URL, where they leak. RFC 9700 and the OAuth 2.1 draft drop it.",
          "Use PKCE for every client. Browser and mobile apps can't keep a client secret, and it's now recommended for server apps too.",
          "Use the `S256` challenge method, never `plain`, register **exact** redirect URIs, and check `state` against CSRF.",
        ],
      },
    ],
    code: `const crypto = require("node:crypto");
// Start: keep the verifier secret, send only its SHA-256 hash
const verifier = crypto.randomBytes(32).toString("base64url");
const challenge = crypto.createHash("sha256")
  .update(verifier).digest("base64url");
// 1. /authorize?code_challenge=<challenge>&code_challenge_method=S256
// 2. POST /token with the code and code_verifier=<verifier>`,
    say: "For the mobile app I'd use the authorisation code flow with PKCE, since it can't keep a secret: short-lived access tokens for the API, a rotating refresh token, and an OpenID Connect ID token for login.",
  },
  {
    id: "password-hashing",
    track: "Building blocks",
    topic: "Passwords",
    title: "A password hash should be slow on purpose",
    hook: "Databases leak. Whether your users' passwords leak with them depends on how expensive you made each guess.",
    points: [
      "**SHA-256** and MD5 are built for speed: one GPU tries billions of guesses a second against a leaked table.",
      "Use a **slow, memory-hard** hash: **Argon2id** first, scrypt next, bcrypt for older systems.",
      "Tune the cost to **tens or hundreds of milliseconds** per hash. At 50 ms, a billion guesses cost about 580 core-days.",
      "A unique random **salt** per user makes identical passwords hash differently, so precomputed **rainbow tables** are useless.",
      "Compare the computed and stored hashes in **constant time**, so response timing reveals nothing.",
    ],
    more: [
      {
        title: "Settings to know",
        points: [
          "**Argon2id**: OWASP's minimum is 19 MiB of memory, 2 iterations and a parallelism of 1.",
          "**scrypt**: N = 2^17, r = 8, p = 1, which needs 128 MiB per hash. **bcrypt**: a work factor of 10 or more.",
          "Memory-hard means each guess needs real RAM, so GPUs and custom chips can't run thousands in parallel cheaply.",
          "The stored string records the algorithm, cost and salt (`$argon2id$v=19$m=19456,t=2,p=1$…`), so you can raise the cost later.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "**bcrypt** ignores everything after the first **72 bytes** of a password, so long passphrases are silently cut.",
          "Re-hash at login when a stored hash uses an old cost: it's the only moment you have the plain password.",
          "Slow hashing makes login a cheap DoS target, so rate-limit attempts per account and per IP.",
          "Never encrypt passwords: whoever gets the key decrypts them all. A hash can't be reversed, only guessed.",
          "A **pepper**, a secret key kept outside the database, protects the hashes if only the database leaks.",
        ],
      },
    ],
    code: `const crypto = require("node:crypto");
const opts = { N: 2 ** 17, r: 8, p: 1, maxmem: 2 ** 28 }; // 128 MiB
function hash(pw, salt = crypto.randomBytes(16)) {
  return { salt, key: crypto.scryptSync(pw, salt, 32, opts) };
}
function verify(pw, { salt, key }) {
  const attempt = hash(pw, salt).key;
  return crypto.timingSafeEqual(attempt, key); // constant time
}
verify("hunter2", hash("hunter2")); // true`,
    say: "I'd store passwords with Argon2id and a random per-user salt, tuned to tens of milliseconds or more per hash, compare in constant time, and rate-limit logins so the slow hash can't be turned against us.",
  },

  // ── Data processing ────────────────────────────────────────────────────────
  {
    id: "stream-windows-watermarks",
    track: "Building blocks",
    topic: "Stream windows",
    title: "A stream never ends, so windows and watermarks decide when to answer",
    hook: "\"Clicks per minute\" sounds simple until events arrive late and out of order. Windows and watermarks are how stream processors cope.",
    points: [
      "**Tumbling** windows are fixed and don't overlap: 12:00–12:01, 12:01–12:02. Each event lands in exactly one.",
      "**Sliding** (or hopping) windows overlap: 5 minutes long, starting every minute, so each event counts in five windows.",
      "**Session** windows close after a gap of inactivity, say 30 minutes, so one user's burst of activity becomes one window.",
      "Group by **event time** (when it happened), not processing time (when it arrived), or a phone that was offline skews the counts.",
      "A **watermark** says \"events older than T shouldn't arrive any more\". When it passes a window's end, the window fires.",
    ],
    more: [
      {
        title: "Late data",
        points: [
          "Events behind the watermark are **late**. Allow some lateness: keep the window's state a little longer and emit a corrected result.",
          "After that, drop late events or route them to a **side output** to reconcile later.",
          "A watermark that trails further behind catches more stragglers, but delays every result by as much.",
          "One idle partition can hold the watermark back and stall every window, so mark idle sources to skip them.",
        ],
      },
      {
        title: "Where it's used",
        points: [
          "**Flink**: watermarks that trail the newest event by a bounded delay, allowed lateness, and side outputs for the rest.",
          "**Kafka Streams**: windowed aggregations with a **grace period** for late records, running as a library inside your service.",
          "**Spark Structured Streaming**: `withWatermark` sets how late data may arrive before old window state is dropped.",
        ],
      },
    ],
    code: `const SIZE = 60_000, DELAY = 5_000; // 1-min windows, 5 s slack
const counts = new Map(); // window start -> count
let watermark = 0;
function onEvent(t) { // t = event time in ms
  watermark = Math.max(watermark, t - DELAY);
  const w = t - (t % SIZE); // tumbling: one window per event
  if (w + SIZE <= watermark) return "late"; // window already fired
  counts.set(w, (counts.get(w) ?? 0) + 1);
}
// emit and delete every window w with w + SIZE <= watermark`,
    say: "I'd count in one-minute tumbling windows on event time, with a watermark trailing the newest event by a few seconds, a grace period for stragglers, and later events sent to a side output to correct the totals.",
  },
  {
    id: "batch-vs-stream",
    track: "Building blocks",
    topic: "Batch vs stream",
    title: "Batch is simple and late; streaming is fast and hard",
    hook: "Most pipelines are one or the other. Pick by how fresh the answer must be, not by which tool is in fashion.",
    points: [
      "**Batch** processes a bounded dataset, like yesterday's logs, in one job. Results arrive minutes to hours later.",
      "Fixing a bug is easy: correct the code and **rerun the job** over the same input to replace the output.",
      "**Streaming** processes unbounded data as it arrives, so results land in seconds or less.",
      "The cost is **state** that must survive crashes, events that arrive late or out of order, and duplicates after retries.",
      "Exactly-once results need **checkpoints** plus idempotent or transactional writes; at-least-once is the cheap default.",
    ],
    more: [
      {
        title: "Lambda and kappa",
        points: [
          "**Lambda**: a batch layer for correct totals plus a speed layer for fresh estimates, merged at query time. Two codebases to keep in sync.",
          "**Kappa**: one streaming pipeline over a replayable log like Kafka. To reprocess, replay the log through a new version.",
        ],
      },
      {
        title: "When to use which",
        points: [
          "Batch: billing runs, nightly reports, ML training, backfills. Stream: fraud checks, alerting, live dashboards, feeds.",
          "**Micro-batching**, Spark Structured Streaming's default mode, sits in between: the stream runs as a series of small batch jobs.",
          "Start with batch unless a requirement needs fresh results: it's cheaper to run and far easier to debug.",
        ],
      },
    ],
    say: "Billing and reports run as nightly batch jobs because they need correct totals, not instant ones. Fraud checks run on the stream, keyed by card, because they must react within seconds.",
  },

  // ── Operations ─────────────────────────────────────────────────────────────
  {
    id: "blue-green-canary",
    track: "Building blocks",
    topic: "Safe deploys",
    title: "Ship to 1% first: a canary turns a bad deploy into a small incident",
    hook: "Most outages start with a change. Blue-green, canaries and flags limit how many users a bad release reaches and how fast you undo it.",
    points: [
      "**Blue-green**: run the new version beside the old and flip all traffic at the load balancer. Rollback is flipping back.",
      "It's instant but costs **double capacity**, and every user meets the new version at the same moment.",
      "**Canary**: send 1% of traffic to the new version, compare its errors and latency with the old, then step to 10%, 50%, 100%.",
      "**Rolling**: replace instances a few at a time. No spare fleet, but old and new versions serve side by side for a while.",
      "**Feature flags** separate deploy from release: ship code dark, turn it on for staff, then 1%, then everyone, with no deploy.",
    ],
    more: [
      {
        title: "Database migrations",
        points: [
          "During any rollout old and new code run together, so every schema change must work with **both** versions.",
          "**Expand, then contract**: add the new column, write to both, backfill, switch reads, then drop the old column in a later release.",
          "Blue-green flips the servers, not the database: both colours usually share one, so its changes must stay compatible.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Automate the canary verdict: roll back when its error rate or p99 is worse than the baseline's, not when someone notices.",
          "1% of a quiet service may be a handful of requests. Hold the canary longer until the numbers mean something.",
          "Flags pile up: remove each one once it's fully on, or every check doubles the code paths you must test.",
        ],
      },
    ],
    code: `const crypto = require("node:crypto");
// Same user, same answer: hash flag + user into a bucket 0–99
function isOn(flag, userId, percent) {
  const h = crypto.createHash("sha256").update(\`\${flag}:\${userId}\`);
  return h.digest().readUInt32BE(0) % 100 < percent;
}
// Raising percent only adds users; nobody flips back and forth
isOn("new-checkout", "user-42", 1);`,
    say: "I'd deploy behind a canary: 1% of traffic, compare error rate and p99 with the baseline, roll back automatically if it's worse, then step up to 100%. Migrations follow expand and contract so both versions can run.",
    source: "/learn/reliability-observability#safe-deploys",
  },
  {
    id: "autoscaling",
    track: "Building blocks",
    topic: "Autoscaling",
    title: "Autoscaling reacts minutes late, so scale on what rises first",
    hook: "Scale on the wrong signal and servers arrive after users have felt the slowdown, or arrive when nothing needed them.",
    points: [
      "Pick the signal by workload: **request rate** for APIs, **queue depth or lag** for workers, and CPU only when the work is CPU-bound.",
      "**Target tracking**: set a target, like 60% CPU or 100 messages per worker, and the scaler adds or removes instances to hold it.",
      "**Cooldowns** stop flapping: scale out quickly, and scale in slowly, only after load has stayed low for several minutes.",
      "New instances take minutes to boot, warm up and pass readiness, so keep **headroom** or scale ahead on a schedule.",
      "Scale-in must **drain**: stop routing new requests to the instance, let in-flight ones finish, then terminate it.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "The **database** doesn't scale with you: going from 10 to 50 instances at 20 connections each takes 200 connections to 1,000.",
          "Set a **maximum**: a retry storm or a bot can scale you into a huge bill or overload a dependency.",
          "Don't scale on latency alone: if a slow dependency is the cause, more instances only add load to it.",
          "CPU misleads for I/O-bound services: they slow down waiting on the database while CPU stays low.",
        ],
      },
      {
        title: "Predictable peaks",
        points: [
          "**Scheduled scaling** adds capacity before the 9 am rush or a sale starts, instead of after the queues build.",
          "Predictive scaling forecasts from past daily and weekly patterns, but it can't foresee a one-off spike.",
        ],
      },
    ],
    code: `// Kubernetes HPA: scale in proportion to how far off target you are
const desired = (replicas, current, target) =>
  Math.ceil(replicas * (current / target));

desired(4, 90, 60); // 6: CPU at 90% against a 60% target
desired(6, 30, 60); // 3, once the scale-down window has passed`,
    say: "I'd scale the API on requests per instance with target tracking, and workers on queue lag. I'd keep about 30% headroom because new instances take minutes, and cap the maximum so database connections still fit.",
    source: "/learn/async-messaging#backpressure-and-littles-law",
  },
];
