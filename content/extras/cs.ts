// Page extras for the CS fundamentals lessons (content/cs/lessons/<dir>/page.mdx), keyed by lesson slug.
// Contract: docs/AUTHORING-EXTRAS.md. Numbers and trade-offs are taken from the lesson they belong to.
import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "processes-threads": {
    // Core: process vs thread, what a context switch saves and costs, the shared-memory race, how to choose, follow-ups.
    // Folded: fork/exec, thread models (1:1, green threads, event loop), the pitfalls list.
    detail: ["fork-exec-and-starting-a-thread", "kernel-threads-green-threads-and-the-event-loop", "where-this-goes-wrong"],
    sayIt: {
      answer:
        "A process owns an address space; threads are paths of execution inside it that share the heap and code but keep their own stack and registers. A context switch saves and restores registers, and the real cost is the cold cache and TLB afterwards. I pick processes for isolation, threads for shared state, and an event loop for many idle connections.",
      numbers: [
        { value: "a few µs", label: "Direct cost of one context switch" },
        { value: "~1 MB", label: "Stack per thread on a typical JVM" },
        { value: "~9%", label: "CPU lost to 50 µs slices" },
      ],
      tradeoffs: [
        "Process vs thread: a process contains crashes but is heavy to start; a thread is cheap and shares memory, but one bug kills all.",
        "Thread per request vs loop: threads are simple; an event loop holds thousands of idle sockets on one stack, but CPU loops block it.",
        "Short vs long time slice: short slices respond faster, long slices lose less time to switching and cache refill.",
      ],
      mention: "Say that counter++ is load, add, store, so two threads can lose an update, before the interviewer asks about locks.",
    },
  },

  "scheduling-memory": {
    // Core: scheduling policies, virtual memory, the TLB and page-table walk, page faults and thrashing, stack vs heap, follow-ups.
    // Folded: the translation-cost arithmetic and huge pages, scheduling traps (priority inversion, starvation).
    detail: ["the-cost-of-translation", "scheduling-traps"],
    sayIt: {
      answer:
        "The scheduler trades average wait against fairness and switching cost: shortest job first minimises waiting but starves long jobs, round robin keeps everyone moving. Virtual memory gives each process a private address space through page tables, a TLB caches translations, and a page fault is the kernel loading a page that is not in RAM.",
      numbers: [
        { value: "17 ms vs 3 ms", label: "Average wait, first come first served vs shortest first" },
        { value: "4 KiB", label: "Usual page size; low 12 bits are the offset" },
        { value: "~2% slower", label: "Memory access with a 99% TLB hit rate" },
      ],
      tradeoffs: [
        "Shortest job first vs round robin: lowest average wait but needs burst times and starves long jobs, against fairness with no knowledge.",
        "Small vs huge pages: 4 KiB pages waste little memory; 2 MiB pages need far fewer TLB entries for big heaps.",
        "Stack vs heap: the stack is fast, freed on return, but small and per thread; the heap is large and shared but needs an allocator.",
      ],
      mention: "Virtual memory is not swap: even with no swap a process still has translated addresses, and thrashing means the working set exceeds RAM.",
    },
  },

  synchronization: {
    // Core: races and critical sections, mutex/semaphore/condition variable, the four deadlock conditions, prevention, follow-ups.
    // Folded: livelock, starvation and priority inversion; safer alternatives to locking.
    detail: ["livelock-starvation-and-priority-inversion", "safer-than-locking"],
    sayIt: {
      answer:
        "A race is a result that depends on timing, and I fix it by making the shared read-modify-write one critical section behind a mutex. A semaphore limits N holders and a condition variable waits for a state. Deadlock needs mutual exclusion, hold and wait, no preemption and circular wait, so I break circular wait with one global lock order.",
      numbers: [
        { value: "4 conditions", label: "All must hold for a deadlock" },
        { value: "1 global order", label: "Lock order that prevents circular wait" },
        { value: "N permits", label: "A semaphore sized to the real resource" },
      ],
      tradeoffs: [
        "Prevention vs detection: a fixed lock order never deadlocks but must be known; detecting a cycle and aborting is flexible but wastes work.",
        "One big lock vs fine-grained locks: one lock is simple and safe but serial; many locks scale but invite deadlock.",
        "Mutex vs spinlock: a mutex sleeps and costs a context switch; a spinlock burns CPU but wins for waits shorter than a switch.",
      ],
      mention: "Never hold a lock while doing I/O or calling unknown code, because that is how small locks become bottlenecks and deadlocks.",
    },
  },

  "concurrency-in-practice": {
    // Core: concurrency vs parallelism and Amdahl, thread pools, producer-consumer, atomics and CAS, async vs threads, follow-ups.
    // Folded: memory visibility and ordering; common failures.
    detail: ["memory-visibility-and-ordering", "common-failures"],
    sayIt: {
      answer:
        "Concurrency is structuring overlapping tasks, parallelism is running them at once, and the serial part caps the speedup. I use a bounded thread pool sized by cores for CPU work and by wait over compute for blocking work, a bounded queue for backpressure, atomics for single counters, and an event loop when the work mostly waits.",
      numbers: [
        { value: "10x", label: "Speedup cap at 90% parallel work" },
        { value: "80 threads", label: "8 cores, 90 ms wait, 10 ms compute" },
        { value: "1 thread", label: "Serves thousands of idle connections" },
      ],
      tradeoffs: [
        "Bounded vs unbounded queue: a bounded queue rejects or blocks under overload; an unbounded one hides it until memory runs out.",
        "Atomics vs locks: CAS never blocks others but retries under contention and protects one word; a lock covers many fields.",
        "Event loop vs threads: the loop holds many idle connections cheaply but is blocked by CPU work; threads use all cores.",
      ],
      mention: "Never block the event loop or a pool worker on work queued behind it; that is how a healthy service freezes under load.",
    },
  },

  "request-journey": {
    // Core: the four stages, DNS and TTL, TLS, HTTP/1.1 vs 2 vs 3, follow-ups.
    // Folded: the TCP handshake (lesson 6 goes deeper), the round-trip arithmetic, speed-ups, failure modes.
    detail: ["the-tcp-handshake", "putting-numbers-on-it", "speeding-up-the-first-byte", "where-this-goes-wrong"],
    sayIt: {
      answer:
        "The browser resolves the name through DNS, opens a TCP connection, negotiates TLS, then sends the HTTP request, and each stage costs at least one round trip. On a repeat visit the address, the connection and the TLS session are reused. HTTP/2 multiplexes streams on one connection, and HTTP/3 over QUIC also removes TCP head-of-line blocking.",
      numbers: [
        { value: "4 round trips", label: "Cold HTTPS with TLS 1.3, DNS uncached" },
        { value: "200 ms", label: "That journey at a 50 ms round trip" },
        { value: "1 round trip", label: "A warm, kept-alive connection" },
      ],
      tradeoffs: [
        "Long vs short DNS TTL: a long TTL saves lookups; a short one lets you fail over fast but adds resolver load.",
        "HTTP/2 vs HTTP/3: HTTP/2 multiplexes over TCP and stalls on loss; HTTP/3 isolates streams but UDP can be blocked and costs more CPU.",
        "TLS 0-RTT vs 1-RTT: early data saves a round trip for returning clients but can be replayed, so only safe requests.",
      ],
      mention: "A bad DNS record or expired certificate is fixed in minutes but caches keep serving it for the TTL, so lower TTLs before risky changes.",
    },
  },

  "tcp-in-depth": {
    // Core: what TCP promises, flow vs congestion control, slow start and AIMD (the widget), loss and retransmission, head-of-line blocking.
    // Folded: closing and TIME_WAIT, the smaller knobs (Nagle, window scaling, keepalive, backlog).
    detail: ["closing-a-connection-and-time-wait", "other-knobs-worth-knowing"],
    sayIt: {
      answer:
        "TCP gives an ordered reliable stream with sequence numbers, ACKs and retransmission. Flow control protects the receiver with its advertised window; congestion control protects the network with slow start and then add-one, halve-on-loss. Three duplicate ACKs trigger a fast retransmit, a timeout resets the window to one, and one lost segment blocks everything behind it.",
      numbers: [
        { value: "10 segments", label: "Modern initial congestion window" },
        { value: "~15 Mbit/s", label: "64 segments in flight at 50 ms" },
        { value: "~470 per second", label: "New connections one client can open: TIME_WAIT limit" },
      ],
      tradeoffs: [
        "Fast retransmit vs timeout: duplicate ACKs recover in about a round trip; a timeout idles for the whole RTO and restarts from one segment.",
        "Reno-style loss reaction vs BBR: reacting to loss is simple and fair but fills buffers; BBR models bandwidth and delay and can be unfair.",
        "Closing first vs second: the side that closes first holds TIME_WAIT, so decide which end can afford the sockets.",
      ],
      mention: "Do not tune TIME_WAIT away; reuse connections with keep-alive or a pool, because port exhaustion is a symptom of too many short connections.",
    },
  },

  "http-and-api-styles": {
    // Core: method and status semantics, HTTP caching, REST, gRPC, GraphQL, choosing, follow-ups.
    // Folded: idempotency keys and retries; errors, versioning, pagination.
    detail: ["idempotency-and-retries", "errors-versioning-and-pagination"],
    sayIt: {
      answer:
        "GET, PUT and DELETE are idempotent so they are safe to retry; POST needs an idempotency key. Caching works through max-age and ETag revalidation, where a 304 saves the bytes. REST is the default for public APIs, gRPC suits internal low-latency or streaming calls, and GraphQL suits many clients needing different fields, if I handle N+1 and cost limits.",
      numbers: [
        { value: "304", label: "Unchanged: saves the body, not the round trip" },
        { value: "N+1 → 1", label: "Queries after batching GraphQL lookups" },
        { value: "429 + Retry-After", label: "How to tell clients to slow down" },
      ],
      tradeoffs: [
        "REST vs gRPC: REST is universal and cacheable by URL; gRPC is smaller, typed and streams but needs a proxy for browsers.",
        "REST vs GraphQL: fixed endpoints are simple to cache and secure; GraphQL fits flexible clients but adds N+1, cost limits and weak HTTP caching.",
        "Offset vs cursor pagination: offset is simple but skips and repeats rows as data changes; a cursor is stable and fast.",
      ],
      mention: "Retrying a timed-out POST can charge twice, so mention the idempotency key before the interviewer asks about failure.",
    },
  },

  "sessions-auth-proxies": {
    // Core: cookies and sessions, JWT vs sessions, CORS and preflight, L4 vs L7, forward and reverse proxies, follow-ups.
    // Folded: sticky sessions, TLS termination and trust, auth mistakes.
    detail: ["sticky-sessions-and-where-state-lives", "tls-termination-and-trust-boundaries", "auth-mistakes-to-avoid"],
    sayIt: {
      answer:
        "A session keeps state on the server behind an HttpOnly, Secure, SameSite cookie, so it can be revoked instantly. A JWT is signed and stateless, so any service can verify it, but it lives until it expires. CORS is the browser asking the server's permission for cross-origin reads, with a preflight for non-simple requests. L4 balances connections, L7 reads HTTP and can route and terminate TLS.",
      numbers: [
        { value: "3 parts", label: "JWT: header, payload, signature" },
        { value: "~15 min", label: "Typical short access-token lifetime" },
        { value: "L4 / L7", label: "Connection routing versus request routing" },
      ],
      tradeoffs: [
        "Sessions vs JWT: sessions revoke at once but need a lookup per request; a JWT needs no lookup but cannot be revoked before it expires.",
        "L4 vs L7 balancer: L4 is fast and protocol-agnostic; L7 routes by path or header and terminates TLS but uses more CPU.",
        "Sticky sessions vs shared store: stickiness is easy but loads unevenly and loses sessions on failure; a shared store keeps servers stateless.",
      ],
      mention: "CORS is enforced by browsers only, so say it protects users and that the API still needs its own authentication.",
    },
  },

  "indexes-btree-lsm": {
    doodle: "index",
    // Core: the cost of an index, B-trees, LSM-trees, the read/write comparison (the widget), composite and covering indexes, query plans.
    // Folded: when an index does not help, other index types.
    detail: ["when-an-index-does-not-help", "other-index-types"],
    sayIt: {
      answer:
        "An index trades slower writes and more space for fast lookups. A B-tree is wide and shallow, so a lookup reads a few pages, and it updates pages in place. An LSM-tree appends to a log and a memtable and merges sorted files in compaction, so writes are cheap and reads need Bloom filters. I order composite indexes equality first and check the plan with EXPLAIN.",
      numbers: [
        { value: "4 levels", label: "B-tree depth for a billion rows, fanout 300" },
        { value: "n → log n", label: "Rows scanned versus index steps" },
        { value: "1 write → N", label: "Index updates per insert with N indexes" },
      ],
      tradeoffs: [
        "B-tree vs LSM-tree: B-trees give predictable reads and range scans; LSM-trees give cheap sequential writes at the cost of read amplification and compaction.",
        "More indexes vs fewer: each index speeds some reads but adds a write, disk and a planner choice.",
        "Covering vs narrow index: a covering index avoids the table fetch but is larger and costs more on every write.",
      ],
      mention: "Say you would check EXPLAIN before adding an index, because low-selectivity columns and functions on columns often ignore it.",
    },
  },

  "transactions-isolation": {
    // Core: ACID, the anomalies, MVCC, locks, write skew and serializable, choosing a level, follow-ups.
    // Folded: the isolation-level matrix, distributed transactions, practical habits.
    detail: ["the-isolation-level-matrix", "distributed-transactions", "practical-habits"],
    sayIt: {
      answer:
        "ACID is atomicity from the undo information and log, consistency from constraints plus application code, isolation from locks or MVCC, and durability from a write-ahead log flushed before commit. Isolation is a dial: read committed stops dirty reads, repeatable read gives a snapshot, and only serializable stops write skew, so I retry on failure. MVCC lets readers and writers proceed without blocking.",
      numbers: [
        { value: "4 properties", label: "Atomicity, consistency, isolation, durability" },
        { value: "5 anomalies", label: "Dirty, non-repeatable, phantom, lost update, write skew" },
        { value: "1 fix", label: "Retry the whole transaction on failure" },
      ],
      tradeoffs: [
        "Read committed vs serializable: read committed is fast and the usual default; serializable is correct for cross-row rules but aborts and needs retries.",
        "MVCC vs locking readers: MVCC never blocks readers on writers but keeps old versions; read locks are simple but cause waiting.",
        "Optimistic vs pessimistic: a version check holds no locks and suits rare conflicts; row locks suit hot rows.",
      ],
      mention: "Write skew passes under snapshot isolation, so name it and the fix (serializable with retry, or lock the rows you read).",
    },
  },

  "storage-engine-wal": {
    // Core: why a log, the write path, checkpoints and recovery, the replication log, follow-ups.
    // Folded: what fsync really means, log-structured and copy-on-write engines, backups and point-in-time recovery.
    detail: ["what-fsync-really-means", "log-structured-and-copy-on-write-engines", "backups-and-point-in-time-recovery"],
    sayIt: {
      answer:
        "A database appends a small sequential log record before it changes a data page, and a commit is durable once that record is fsynced. Dirty pages are flushed lazily, a checkpoint bounds how much log recovery must replay, and recovery redoes committed work and discards the rest. The same log, shipped to replicas, drives replication.",
      numbers: [
        { value: "log first", label: "Rule: log before data page" },
        { value: "500 → 50,000", label: "Commits a second: solo versus group of 100" },
        { value: "1 fsync", label: "Disk wait on the commit path" },
      ],
      tradeoffs: [
        "Frequent vs rare checkpoints: frequent ones shorten recovery but add page-write load; rare ones leave a long replay.",
        "Synchronous vs asynchronous replica: synchronous loses no commits on failover but waits on the network; asynchronous is fast and can lose the tail.",
        "Strict fsync vs relaxed commit: fsync every commit is safest; relaxing it raises throughput and risks the last few milliseconds.",
      ],
      mention: "A full log disk or a stuck replica that stops log recycling stops all writes, so alert on log size and replication lag.",
    },
  },

  "schema-and-joins": {
    // Core: normalization, denormalization, join algorithms, join types, follow-ups.
    // Folded: keys and constraints, joins at scale, common modeling decisions.
    detail: ["keys-and-constraints", "joins-at-scale", "common-modeling-decisions"],
    sayIt: {
      answer:
        "I normalize first so each fact lives in one place and updates cannot disagree with themselves, up to third normal form. I denormalize only for a measured hot read path and say what keeps the copy correct. Joins run as nested loop, hash or merge, chosen by sizes, indexes and sort order, and at scale I co-locate related rows by the shard key.",
      numbers: [
        { value: "3NF", label: "Key, whole key, nothing but the key" },
        { value: "100,000 vs 1,100", label: "Nested loop vs hash join steps" },
        { value: "3 join algorithms", label: "Nested loop, hash, merge" },
      ],
      tradeoffs: [
        "Normalized vs denormalized: normalized changes one place but needs joins; denormalized reads fast but copies can go stale.",
        "Hash vs merge join: hash needs memory for a table but takes unsorted input; merge needs sorted inputs and no extra memory.",
        "Foreign keys in the database vs in code: the database refuses orphans for free correctness; some huge systems skip them for write speed.",
      ],
      mention: "Whenever you denormalize, say what updates the copy and what happens when that update fails.",
    },
  },
};
