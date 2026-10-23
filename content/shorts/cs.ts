import type { Short } from "./types";

// Shorts for the CS fundamentals track (content/cs/lessons). Order follows the lessons.
export const shorts: Short[] = [
  // 1. Processes, threads and context switches
  {
    id: "process-vs-thread",
    track: "CS fundamentals",
    topic: "Threads",
    title: "A process owns memory; threads share it",
    hook: "Say what is shared and what is private before the interviewer asks, and the rest of the answer follows.",
    points: [
      "A **process** has its own address space, open files and PID. Another process cannot touch its memory.",
      "**Threads** inside it share the heap, code and open files, but each has its own **stack** and registers.",
      "Sharing makes threads cheap to start and talk to. It also makes `counter++` a race.",
      "A crash in one thread kills the whole process. A crash in one process leaves the others alone.",
    ],
    more: [
      {
        title: "Pick one",
        points: [
          "**Processes** when failure or security must stay contained: browser tabs, Postgres connections.",
          "**Threads** when work shares state and is CPU-bound.",
          "An **event loop** when thousands of connections mostly wait.",
        ],
      },
    ],
    say: "A process owns an address space; its threads share the heap and keep their own stack and registers, so they are cheap but need locks.",
    source: "/cs/processes-threads#process-or-thread-what-is-the-difference",
  },
  {
    id: "context-switch-cost",
    track: "CS fundamentals",
    topic: "Context switch",
    title: "A context switch costs more than the registers",
    hook: "Saving registers takes microseconds. The slow part is the cold cache and TLB the next thread inherits.",
    points: [
      "The kernel saves the running thread's **registers**, including program counter and stack pointer, then loads the next thread's.",
      "A switch between **processes** also changes the page tables, so the TLB may be flushed.",
      "A switch between **threads** of one process keeps the address space, so it is cheaper.",
      "With a 50 µs slice and a 5 µs switch, about **9%** of the CPU is spent switching.",
    ],
    more: [
      {
        title: "Why slices are milliseconds",
        points: [
          "Long slices hide the switch cost but make the system feel slow to respond.",
          "Thousands of runnable threads mean constant switching and cache misses, so cap the pool.",
        ],
      },
    ],
    code: "const overhead = (slice, sw, refill = 0) =>\n  (sw + refill) / (slice + sw + refill);\n\noverhead(4000, 5);   // 0.00125\noverhead(50, 5);     // 0.09",
    say: "A context switch saves and restores registers in microseconds, but the real cost is the cold cache and TLB afterwards.",
    source: "/cs/processes-threads#what-a-context-switch-saves-and-why-it-costs",
  },

  // 2. Scheduling and memory
  {
    id: "scheduling-policies",
    track: "CS fundamentals",
    topic: "Scheduling",
    title: "No scheduler wins on wait, fairness and overhead together",
    hook: "The classic example: jobs of 24, 3 and 3 ms give averages of 17, 3 or 5.7 ms depending on the policy.",
    points: [
      "**First come, first served**: simple, but a long job in front makes every short job wait (17 ms average).",
      "**Shortest job first**: the lowest average wait (3 ms), but it needs burst times and can starve long jobs.",
      "**Round robin**: each job gets a quantum, so nobody waits long and no burst times are needed (about 5.7 ms).",
      "A quantum that is too small wastes time switching. Too large and it becomes first come, first served.",
    ],
    more: [
      {
        title: "Real schedulers",
        points: [
          "A **multilevel feedback queue** demotes jobs that burn their whole quantum and favours those that block on I/O.",
          "**Priority inversion**: a low-priority lock holder blocks a high-priority waiter. Priority inheritance fixes it.",
        ],
      },
    ],
    say: "Shortest job first minimises waiting but starves long jobs; round robin is fair without knowing burst times; real schedulers blend them.",
    source: "/cs/scheduling-memory#scheduling-who-runs-next",
  },
  {
    id: "virtual-memory-tlb",
    track: "CS fundamentals",
    topic: "Virtual memory",
    title: "Virtual memory: translate the page number, keep the offset",
    hook: "Each process gets a private address space. A tiny cache, the TLB, keeps the translation from slowing every access.",
    points: [
      "Memory is cut into **pages** (usually 4 KiB). A **page table** maps each page to a physical **frame**.",
      "An address is a page number plus a 12-bit offset. Only the page number is translated: `0x3A7C` is page 3, offset `0xA7C`.",
      "The **TLB** caches recent translations. A hit costs about a nanosecond; a miss walks the page table.",
      "A **page fault** means the page is not in RAM yet: the kernel loads it and retries the instruction.",
    ],
    more: [
      {
        title: "Thrashing",
        points: [
          "If the working set exceeds RAM, pages are evicted just before they are needed and the machine waits on disk.",
          "A loop over 5 pages with 4 frames faults on every access under LRU.",
        ],
      },
    ],
    say: "Virtual memory translates page numbers through a page table, the TLB caches that translation, and a page fault is the kernel loading a missing page.",
    source: "/cs/scheduling-memory#walk-an-address-through-the-tlb-and-page-table",
  },

  // 3. Locks, semaphores and deadlock
  {
    id: "deadlock-four-conditions",
    track: "CS fundamentals",
    topic: "Deadlock",
    title: "Deadlock needs four conditions; break one and it is gone",
    hook: "Thread 1 holds A and wants B, thread 2 holds B and wants A. The interview answer is the four conditions and the cheapest fix.",
    points: [
      "**Mutual exclusion**: a resource is held by one thread at a time.",
      "**Hold and wait**: a thread keeps what it has while it waits for more.",
      "**No preemption**: nobody can take a held resource away.",
      "**Circular wait**: a ring of threads each waits for the next one.",
      "Cheapest prevention: take locks in one **global order**, which makes a ring impossible.",
    ],
    more: [
      {
        title: "Other ways out",
        points: [
          "**Timeouts**: give up, release and retry. Simple, but the work may repeat.",
          "**Detection**: find a cycle in the wait-for graph and abort one victim. Databases do this.",
        ],
      },
    ],
    code: "// one global order: lock the lower id first\nconst inLockOrder = (a, b) => (a < b ? [a, b] : [b, a]);\n\ninLockOrder(7, 3); // [3, 7]\ninLockOrder(3, 7); // [3, 7]",
    say: "Deadlock needs mutual exclusion, hold and wait, no preemption and circular wait; I prevent it by taking locks in a global order.",
    source: "/cs/synchronization#deadlock-and-its-four-conditions",
  },
  {
    id: "mutex-semaphore-condvar",
    track: "CS fundamentals",
    topic: "Locks",
    title: "Mutex, semaphore, condition variable: three jobs",
    hook: "Reaching for the wrong tool is the common mistake. Each one answers a different question.",
    points: [
      "A **mutex** lets one thread into a critical section. The thread that locked it unlocks it.",
      "A **semaphore** counts permits: at most N holders. A pool of 10 connections is a semaphore of 10.",
      "A **condition variable** lets a thread sleep until something is true, always paired with a mutex.",
      "Wait in a loop: `while (empty) wait(cond)`, because wake-ups can be spurious or stolen.",
    ],
    more: [
      {
        title: "Keep locks small",
        points: [
          "Lock, touch the shared data, unlock. Never do I/O or call unknown code while holding a lock.",
          "Even single-threaded JavaScript races across an `await`: read, await, write back a stale value.",
        ],
      },
    ],
    say: "A mutex excludes, a semaphore limits N, a condition variable waits for a state, and I always recheck the condition in a loop.",
    source: "/cs/synchronization#mutex-semaphore-and-condition-variable",
  },

  // 4. Concurrency in practice
  {
    id: "thread-pool-sizing",
    track: "CS fundamentals",
    topic: "Thread pools",
    title: "Size a thread pool from the work, then bound its queue",
    hook: "A thread per request is unbounded, and a pool with an unbounded queue only hides the overload until memory runs out.",
    points: [
      "**CPU-bound** tasks: about one worker per core. More only adds context switches.",
      "Tasks that **wait**: cores × (1 + wait / compute). Eight cores, 90 ms wait, 10 ms compute gives about 80.",
      "Bound the queue and choose what happens when it is full: reject, block the caller, or run on the caller.",
      "**Amdahl**: at 90% parallel work no number of workers beats 10x, and 8 workers give about 4.7x.",
    ],
    more: [
      {
        title: "How pools freeze",
        points: [
          "Tasks that wait for sibling tasks in the same pool can use up every worker and deadlock.",
          "Swallowed exceptions: read the future or the error vanishes.",
        ],
      },
    ],
    code: "const poolSize = (cores, wait, compute) =>\n  Math.round(cores * (1 + wait / compute));\n\npoolSize(8, 0, 10);   // 8\npoolSize(8, 90, 10);  // 80",
    say: "I size a pool at one worker per core for CPU work, cores times one plus wait over compute for blocking work, and I always bound the queue.",
    source: "/cs/concurrency-in-practice#thread-pools",
  },
  {
    id: "event-loop-vs-threads",
    track: "CS fundamentals",
    topic: "Event loop",
    title: "One thread can serve thousands of connections, until it blocks",
    hook: "An event loop is great at waiting and terrible at computing. Know which your workload is.",
    points: [
      "The loop takes callbacks from a queue. While a request waits on the network it runs something else.",
      "Order: current code, then **promise callbacks** (microtasks), then the next timer or I/O callback.",
      "A busy callback delays everything: a 0 ms timer fired 40 ms late after a 40 ms busy loop.",
      "Idle sockets are cheap. CPU-heavy work belongs in worker threads or separate processes.",
    ],
    more: [
      {
        title: "Related tools",
        points: [
          "**CAS** (compare-and-swap) updates one shared number without a lock, retrying if someone else wrote first.",
          "A **bounded buffer** between producer and consumer gives backpressure instead of unbounded growth.",
        ],
      },
    ],
    say: "An event loop serves many idle connections on one thread, but any CPU work blocks everyone, so compute goes to workers.",
    source: "/cs/concurrency-in-practice#async-versus-threads-and-the-event-loop",
  },

  // 5. The request journey
  {
    id: "url-to-response",
    track: "CS fundamentals",
    topic: "Request journey",
    title: "Typing a URL: four stages, each at least one round trip",
    hook: "DNS, TCP, TLS, then HTTP. At a 50 ms round trip a cold request needs about 200 ms before any server work.",
    points: [
      "**DNS** turns the name into an address. Answers are cached for their **TTL** at the browser, OS and resolver.",
      "**TCP** opens the connection with SYN, SYN-ACK, ACK: one round trip.",
      "**TLS 1.3** agrees a key and checks the certificate in one more round trip. TLS 1.2 needs two.",
      "Then the **HTTP** request. A kept-alive connection skips every earlier stage: one round trip.",
    ],
    more: [
      {
        title: "Cut the setup",
        points: [
          "Reuse connections, serve from a CDN near the user, resume TLS sessions.",
          "Lower the DNS TTL a day before a planned move, or caches keep the old address.",
        ],
      },
    ],
    say: "A cold HTTPS request pays for DNS, TCP and TLS before the request, so I cut round trips with reuse, a nearby edge and TLS 1.3.",
    source: "/cs/request-journey#what-happens-when-you-type-a-url",
  },
  {
    id: "cs-http-versions",
    track: "CS fundamentals",
    topic: "HTTP/3",
    title: "HTTP/1.1, 2 and 3 differ in what one lost packet does",
    hook: "Same semantics, three transports. The interesting difference is head-of-line blocking.",
    points: [
      "**HTTP/1.1**: one request at a time per connection, so browsers open about six.",
      "**HTTP/2**: many streams on one TCP connection with compressed headers.",
      "But TCP delivers one ordered byte stream, so a single lost packet stalls every HTTP/2 stream.",
      "**HTTP/3** runs on **QUIC** over UDP: streams are independent and TLS 1.3 is built into the handshake.",
    ],
    more: [
      {
        title: "QUIC extras",
        points: [
          "A connection is identified by an ID, not an IP address, so it survives a switch from Wi-Fi to mobile.",
          "Some networks block UDP, so clients fall back to HTTP/2 over TCP.",
        ],
      },
    ],
    say: "HTTP/2 multiplexes streams over one TCP connection and stalls on loss; HTTP/3 over QUIC isolates streams and merges the handshakes.",
    source: "/cs/request-journey#http11-http2-and-http3",
  },

  // 6. TCP in depth
  {
    id: "flow-vs-congestion-control",
    track: "CS fundamentals",
    topic: "TCP windows",
    title: "Flow control protects the receiver, congestion control the network",
    hook: "Two windows, two jobs. The sender may have at most the smaller of the two unacknowledged.",
    points: [
      "**Flow control**: the receiver advertises how much buffer it has (rwnd) in every ACK.",
      "**Congestion control**: the sender computes its own window (cwnd) from loss and delay.",
      "**Slow start** doubles cwnd every round trip, from 10 segments, until ssthresh. Then it adds one per round trip.",
      "Three duplicate ACKs **halve** cwnd. A timeout resets it to 1 and restarts slow start.",
    ],
    more: [
      {
        title: "Rule of thumb",
        points: [
          "Throughput is about one window per round trip: 64 segments of 1,460 bytes at 50 ms is about 15 Mbit/s.",
          "Linux defaults to CUBIC; BBR models bandwidth and delay instead of reacting to loss.",
        ],
      },
    ],
    code: "// cwnd per round trip\n// slow start: 10, 20, 40, 64 (ssthresh)\n// then: 65, 66, 67 ...\n// 3 dup ACKs at 66: 33, 34, 35 ...\n// timeout at 66: 1, 2, 4, 8 ...",
    say: "Flow control protects the receiver, congestion control protects the network, and the sender uses the smaller window.",
    source: "/cs/tcp-in-depth#flow-control-versus-congestion-control",
  },
  {
    id: "tcp-time-wait",
    track: "CS fundamentals",
    topic: "TIME-WAIT",
    title: "TIME-WAIT limits how fast one client can open connections",
    hook: "Port exhaustion looks like a networking mystery. It is the arithmetic of closing connections.",
    points: [
      "The side that closes first keeps the connection in **TIME-WAIT** for about 60 seconds on Linux.",
      "It makes sure the final ACK arrives and that late packets cannot corrupt a new connection.",
      "Each one holds a source port. About 28,000 ports over 60 seconds is roughly **470 new connections a second** to one destination.",
      "The fix is fewer connections: keep-alive, pools or HTTP/2, not a smaller TIME-WAIT.",
    ],
    more: [
      {
        title: "Related symptoms",
        points: [
          "Connect errors under load with many sockets in TIME-WAIT point at short-lived connections.",
          "Idle connections also die silently behind NATs, so use keepalive or heartbeats.",
        ],
      },
    ],
    say: "TIME-WAIT holds a port for about a minute after close, so thousands of short connections exhaust ports; reuse connections.",
    source: "/cs/tcp-in-depth#closing-a-connection-and-time-wait",
  },

  // 7. HTTP and API styles
  {
    id: "http-idempotency-caching",
    track: "CS fundamentals",
    topic: "HTTP",
    title: "HTTP methods carry retry rules; ETags carry caching rules",
    hook: "Two small features explain most HTTP interview questions: which requests are safe to repeat, and what a 304 means.",
    points: [
      "**GET, PUT, DELETE** are idempotent: repeating them leaves the same state. **POST** is not.",
      "A timed-out POST needs an **idempotency key** so a retry returns the first result instead of charging twice.",
      "`Cache-Control: max-age` lets the browser reuse a response with no request at all.",
      "After that it revalidates with `If-None-Match`, and an unchanged resource returns **304** with no body.",
    ],
    more: [
      {
        title: "Status codes to know",
        points: [
          "**401** not logged in, **403** logged in but not allowed, **409** conflict, **429** slow down (with `Retry-After`).",
          "**502** and **504** mean a gateway got a bad or no answer from upstream.",
        ],
      },
    ],
    say: "GET, PUT and DELETE are safe to retry, POST needs an idempotency key, and a 304 saves the body but not the round trip.",
    source: "/cs/http-and-api-styles#http-semantics-that-interviews-probe",
  },
  {
    id: "cs-rest-grpc-graphql",
    track: "CS fundamentals",
    topic: "API styles",
    title: "REST, gRPC or GraphQL: pick by who calls it",
    hook: "Each style fixes one problem and brings another. Name both in the interview.",
    points: [
      "**REST**: resources and verbs over HTTP/JSON. Universal, cacheable by URL, easy to debug. The default.",
      "**gRPC**: typed `.proto` contracts, binary protobuf, HTTP/2 streaming and deadlines. Best between internal services.",
      "**GraphQL**: the client names the fields it wants, so one round trip fits each screen.",
      "GraphQL's trap is **N+1**: one query per item. A loader batches the lookups in one tick into a single call.",
    ],
    more: [
      {
        title: "Costs",
        points: [
          "gRPC needs a proxy for browsers and is not human-readable.",
          "GraphQL needs query cost limits, per-field authorization and client-side caching by object ID.",
        ],
      },
    ],
    say: "REST for public APIs, gRPC for internal low-latency or streaming calls, GraphQL when many clients need different fields.",
    source: "/cs/http-and-api-styles#choosing-between-them",
  },

  // 8. Sessions, auth and proxies
  {
    id: "session-vs-jwt",
    track: "CS fundamentals",
    topic: "Sessions & JWT",
    title: "Sessions revoke instantly; JWTs verify without a lookup",
    hook: "The trade is where state lives, and what it costs to take access away.",
    points: [
      "A **session** keeps data on the server. The cookie is just a random ID: `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax`.",
      "Delete the session and access ends on the next request. The price is one lookup per request.",
      "A **JWT** is header, payload and signature. Any service with the key verifies it with no lookup.",
      "But it is valid until `exp`, so use a lifetime of minutes plus a refresh token, or keep a deny-list.",
    ],
    more: [
      {
        title: "Do not forget",
        points: [
          "The JWT payload is signed, not encrypted. Anyone holding the token can read it.",
          "Verify with the algorithm you choose, never the one the token claims (the `alg: none` attack).",
          "A token in `localStorage` is readable by XSS; an HttpOnly cookie is not.",
        ],
      },
    ],
    say: "Sessions are easy to revoke but need a lookup; JWTs are stateless but live until they expire, so keep them short.",
    source: "/cs/sessions-auth-proxies#jwt-versus-server-sessions",
  },
  {
    id: "cors-preflight",
    track: "CS fundamentals",
    topic: "CORS",
    title: "CORS is the browser asking permission, not a server defence",
    hook: "A script on one site cannot read replies from another origin unless that server opts in.",
    points: [
      "An **origin** is scheme + host + port. The **same-origin policy** blocks cross-origin reads by default.",
      "The server opts in with `Access-Control-Allow-Origin`. With cookies it must name the origin, never `*`.",
      "A PUT, a JSON body or an Authorization header triggers an **OPTIONS preflight** first.",
      "`curl` and other servers ignore CORS, so the API still needs real authentication.",
    ],
    more: [
      {
        title: "Common mistakes",
        points: [
          "Reflecting any origin with credentials allowed lets every site read user data.",
          "Forgetting `Vary: Origin` lets a cache serve one origin's headers to another.",
        ],
      },
    ],
    say: "CORS is enforced by the browser to protect users; it does not protect the API from non-browser callers.",
    source: "/cs/sessions-auth-proxies#cors",
  },
  {
    id: "l4-vs-l7-proxy",
    track: "CS fundamentals",
    topic: "L4 vs L7",
    title: "L4 balances connections; L7 balances requests",
    hook: "The layer decides what the balancer can see, and so what it can do.",
    points: [
      "**L4** picks a backend from IPs and ports and forwards packets unread: fast, protocol-agnostic.",
      "**L7** terminates the connection, parses HTTP, and can route by path, host or header.",
      "L7 also does TLS termination, retries, cookie stickiness and `X-Forwarded-For`, at more CPU cost.",
      "A **reverse proxy** acts for servers; a **forward proxy** acts for clients.",
    ],
    more: [
      {
        title: "Practical split",
        points: [
          "L4 in front for raw throughput and non-HTTP traffic, L7 behind it for smart routing.",
          "Trust `X-Forwarded-For` only when your own proxy set it.",
        ],
      },
    ],
    say: "L4 routes by address and port without reading the payload; L7 reads HTTP, so it can route by path and terminate TLS.",
    source: "/cs/sessions-auth-proxies#load-balancing-l4-versus-l7",
  },

  // 9. Indexes
  {
    id: "btree-vs-lsm-cost",
    track: "CS fundamentals",
    topic: "B-tree vs LSM",
    title: "B-trees rewrite pages in place; LSM-trees append and merge later",
    hook: "Both pay for fast lookups somewhere. The question is whether you pay on writes or on reads.",
    points: [
      "A **B-tree** page holds hundreds of keys, so 4 levels reach a billion rows: about 4 page reads per lookup.",
      "Its writes update pages **in place**, which is random I/O, and a full page splits in two.",
      "An **LSM-tree** appends to a log and a sorted memtable, then flushes immutable sorted files. Writes are sequential.",
      "Reads may check several files, so **Bloom filters** skip files that cannot hold the key. **Compaction** merges files in the background.",
    ],
    more: [
      {
        title: "Pick by workload",
        points: [
          "Read-heavy OLTP and range scans: B-tree (Postgres, MySQL).",
          "Write-heavy ingest and time series: LSM-tree (RocksDB, Cassandra).",
          "A delete in an LSM-tree is a tombstone that compaction removes later.",
        ],
      },
    ],
    say: "B-trees give predictable reads with in-place writes; LSM-trees turn writes into sequential appends and pay on reads and compaction.",
    source: "/cs/indexes-btree-lsm#b-tree-or-lsm-read-and-write-cost",
  },
  {
    id: "composite-index-order",
    track: "CS fundamentals",
    topic: "Composite index",
    title: "Composite index order: equality first, range last",
    hook: "An index on (a, b, c) is sorted by a, then b inside a, then c inside b. That decides what it can serve.",
    points: [
      "It narrows by equality on a **leading run** of its columns, plus one range column right after.",
      "`WHERE b = 5` alone cannot use an index on (a, b): the **leftmost-prefix rule**.",
      "A **covering index** contains every column the query reads, so the table row is never fetched (an index-only scan).",
      "Check with `EXPLAIN`: look for a sequential scan, an index scan or an index-only scan.",
    ],
    more: [
      {
        title: "When the planner skips it",
        points: [
          "The query matches most rows, so a scan is cheaper.",
          "A function on the column (`lower(email)`) or a leading wildcard (`LIKE '%x'`).",
          "Stale statistics: compare estimated and actual rows in the plan.",
        ],
      },
    ],
    say: "I put equality columns first and the range column last, and I check EXPLAIN because every index also taxes every write.",
    source: "/cs/indexes-btree-lsm#composite-and-covering-indexes",
  },

  // 10. Transactions
  {
    id: "isolation-anomalies",
    track: "CS fundamentals",
    topic: "Isolation",
    title: "Isolation levels are a list of anomalies you accept",
    hook: "Know the five anomalies and which level stops which, and the isolation question is easy.",
    points: [
      "**Dirty read**: reading uncommitted data. **Read committed** stops it.",
      "**Non-repeatable read**: a row changes between two reads. **Repeatable read** (a snapshot) stops it.",
      "**Lost update**: two read-modify-writes, one write vanishes. A write-conflict check or a locked read stops it.",
      "**Write skew**: two transactions change different rows and together break a rule. Only **serializable** stops it.",
    ],
    more: [
      {
        title: "Defaults and cost",
        points: [
          "Postgres and Oracle default to read committed; MySQL InnoDB to repeatable read.",
          "Serializable aborts conflicting transactions, so the code must retry the whole transaction.",
        ],
      },
    ],
    say: "Read committed stops dirty reads, repeatable read gives a snapshot, and only serializable stops write skew, so I retry on failure.",
    source: "/cs/transactions-isolation#the-anomalies",
  },
  {
    id: "mvcc-snapshots",
    track: "CS fundamentals",
    topic: "MVCC",
    title: "MVCC: a write adds a version, so readers never wait",
    hook: "The reason a long report does not freeze your updates.",
    points: [
      "A write does not overwrite. It adds a new row **version** stamped with its commit.",
      "Each transaction reads the newest version committed before its **snapshot**.",
      "Two transactions writing the same row conflict: the **first committer wins**, the other retries.",
      "Old versions are cleaned up later (vacuum), so very long transactions bloat storage.",
    ],
    more: [
      {
        title: "Still needs locks",
        points: [
          "Writers still take row locks, and deadlocks are detected and one transaction aborted.",
          "`SELECT ... FOR UPDATE` locks the rows you read, which also stops write skew on them.",
        ],
      },
    ],
    say: "MVCC keeps old versions so readers and writers do not block each other; the cost is storage and cleanup.",
    source: "/cs/transactions-isolation#mvcc-readers-do-not-block-writers",
  },

  // 11. Storage engine and WAL
  {
    id: "cs-write-ahead-log",
    track: "CS fundamentals",
    topic: "WAL",
    title: "Write-ahead log: log first, so a commit survives a crash",
    hook: "Data pages are flushed lazily, so a committed change may exist only in RAM. The log is what makes it durable.",
    points: [
      "Before a change reaches a data page, a small record of it is appended to a sequential **log**.",
      "A commit is acknowledged once that record is flushed (**fsync**). The only disk wait is the log write.",
      "Dirty pages are written later in the background. A **checkpoint** records how far that has got.",
      "After a crash, recovery replays the log from the last checkpoint and drops transactions with no commit record.",
    ],
    more: [
      {
        title: "Numbers and trade-offs",
        points: [
          "With a 2 ms fsync one commit at a time allows 500 a second. **Group commit** of 100 allows 50,000.",
          "Frequent checkpoints shorten recovery but add write load.",
          "`synchronous_commit = off` can lose the last few milliseconds of commits but never corrupts data.",
        ],
      },
    ],
    say: "I write the log before the page, ack the commit after the fsync, and recover by replaying from the last checkpoint.",
    source: "/cs/storage-engine-wal#why-a-database-needs-a-log",
  },
  {
    id: "replication-log",
    track: "CS fundamentals",
    topic: "Replication log",
    title: "Replication is just shipping the log",
    hook: "The log is an ordered record of every change, so another machine can replay it.",
    points: [
      "A replica applying the same records in the same order ends up with the same data.",
      "**Physical** shipping sends page-level records (Postgres streaming). **Logical** sends row changes (MySQL binlog).",
      "**Synchronous**: the commit waits for the replica. No loss on failover, but network latency on every commit.",
      "**Asynchronous**: fast commits, but the last transactions can be lost if the primary dies.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "A stuck replica or archive job can stop old log from being recycled and fill the disk.",
          "Reads from an async replica can be stale: replication lag is a behaviour, not a bug.",
        ],
      },
    ],
    say: "Replication ships the write-ahead log: synchronous loses nothing but waits, asynchronous is fast and can lose the tail.",
    source: "/cs/storage-engine-wal#the-replication-log",
  },

  // 12. Schema design and joins
  {
    id: "normalize-vs-denormalize",
    track: "CS fundamentals",
    topic: "Normalization",
    title: "Normalize first; denormalize only a measured hot read",
    hook: "Repeating a fact on every row lets copies disagree. Copying on purpose needs a plan to keep them in sync.",
    points: [
      "**Normalization** stores each fact once: third normal form means each column depends on the key, the whole key and nothing but the key.",
      "Repetition causes **update anomalies**: a customer's city on ten orders must change ten times, or the data disagrees with itself.",
      "**Denormalize** (a copied column, a precomputed total, a materialized view, an embedded document) to avoid a join on a hot read.",
      "Say what keeps the copy correct: the same transaction, a trigger, or an async job that tolerates staleness.",
    ],
    more: [
      {
        title: "Where it is by design",
        points: [
          "Analytics star schemas and document stores are denormalized because they are read far more than written.",
          "In a sharded system, denormalizing can replace a cross-shard join.",
        ],
      },
    ],
    say: "I normalize to prevent anomalies, then denormalize a measured hot path and say what keeps the copy correct.",
    source: "/cs/schema-and-joins#normalization-one-fact-in-one-place",
  },
  {
    id: "join-algorithms",
    track: "CS fundamentals",
    topic: "Joins",
    title: "Nested loop, hash join, merge join: same rows, different work",
    hook: "For 100 users and 1,000 orders a naive join does 100,000 comparisons; a hash join does about 1,100.",
    points: [
      "**Nested loop**: for each outer row, look at the inner side. Cheap only with an index on the inner join column.",
      "**Hash join**: build a hash table on the smaller side, probe it with the other. Needs memory, takes unsorted input.",
      "**Merge join**: walk two inputs already sorted on the key, once. No extra memory.",
      "`EXPLAIN` shows which one ran. The planner chooses from row estimates, so stale statistics can fool it.",
    ],
    more: [
      {
        title: "Join types",
        points: [
          "**INNER** matches only. **LEFT** keeps every left row with NULLs when nothing matches.",
          "An **anti-join** (LEFT JOIN ... WHERE right.id IS NULL, or NOT EXISTS) finds rows with no match.",
        ],
      },
    ],
    say: "A join is nested loop, hash or merge; I pick by sizes, indexes and sort order, and I check the plan.",
    source: "/cs/schema-and-joins#joins-nested-loop-hash-and-merge",
  },
];
