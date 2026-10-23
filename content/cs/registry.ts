// The CS fundamentals track: operating systems and concurrency, networking, and database internals, taught as short
// interview-oriented lessons that each end with follow-up questions and a quiz. Lesson bodies live next to this file:
// content/cs/lessons/<dir>/page.mdx (plus quiz.ts, optional diagrams.ts and snippets/). Authoring guide: docs/AUTHORING-CS.md.

export type CsGroup = "Operating systems and concurrency" | "Networking" | "Databases internals";
export const CS_GROUPS: CsGroup[] = ["Operating systems and concurrency", "Networking", "Databases internals"];

export interface CsLesson {
  slug: string;
  dir: string;
  order: number;
  group: CsGroup;
  title: string;
  short: string;
  summary: string;
  minutes: number;
  tags: string[];
  outcomes: string[];
  next: string;
}

export const csLessons: CsLesson[] = [
  {
    slug: "processes-threads", dir: "01-processes-threads", order: 1, group: "Operating systems and concurrency",
    title: "Processes, Threads and Context Switches", short: "Processes & threads",
    summary: "What a process owns, what threads share, and what the CPU actually does when it switches between them.",
    minutes: 20, tags: ["process", "thread", "context switch", "address space", "race condition", "operating systems"],
    outcomes: ["Say what a process owns and what its threads share", "Explain what a context switch saves and why it costs", "Choose processes, threads or an event loop for a workload"],
    next: "Threads share memory, and memory is virtual. Next: how the OS schedules them and maps their addresses.",
  },
  {
    slug: "scheduling-memory", dir: "02-scheduling-memory", order: 2, group: "Operating systems and concurrency",
    title: "Scheduling and Memory: Virtual Memory, Paging and the TLB", short: "Scheduling & memory",
    summary: "How the OS picks who runs next, and how every process gets its own private address space through paging.",
    minutes: 25, tags: ["scheduler", "virtual memory", "paging", "tlb", "page fault", "stack", "heap", "operating systems"],
    outcomes: ["Compare FCFS, shortest-job and round robin scheduling", "Walk an address through the page table and the TLB", "Explain a page fault, thrashing, and stack versus heap"],
    next: "Many threads can now run at once. Next: what goes wrong when they touch the same data.",
  },
  {
    slug: "synchronization", dir: "03-synchronization", order: 3, group: "Operating systems and concurrency",
    title: "Locks, Semaphores and Deadlock", short: "Synchronization",
    summary: "Race conditions, the three tools that tame them, and deadlock: its four conditions and the cheap ways to prevent it.",
    minutes: 25, tags: ["mutex", "semaphore", "condition variable", "race condition", "deadlock", "livelock", "synchronization"],
    outcomes: ["Pick a mutex, semaphore or condition variable for a job", "Name the four conditions for deadlock", "Prevent deadlock with a global lock order"],
    next: "Locks are the blunt tool. Next: thread pools, producer-consumer, atomics, and when an event loop beats threads.",
  },
  {
    slug: "concurrency-in-practice", dir: "04-concurrency-in-practice", order: 4, group: "Operating systems and concurrency",
    title: "Concurrency in Practice: Pools, Queues, Atomics and the Event Loop", short: "Concurrency in practice",
    summary: "The building blocks real systems use: sized thread pools, bounded queues, compare-and-swap, and when an event loop beats threads.",
    minutes: 25, tags: ["thread pool", "producer consumer", "backpressure", "atomics", "compare and swap", "event loop", "async", "amdahl"],
    outcomes: ["Size a thread pool from the workload", "Explain backpressure with a bounded producer-consumer queue", "Choose between async, threads and processes"],
    next: "Next, networking: what happens between typing a URL and the first byte coming back.",
  },
  {
    slug: "request-journey", dir: "05-request-journey", order: 5, group: "Networking",
    title: "The Request Journey: DNS, TCP, TLS and HTTP", short: "Request journey",
    summary: "What happens between typing a URL and the first byte back: DNS, the TCP handshake, TLS, and how HTTP/1.1, 2 and 3 differ.",
    minutes: 20, tags: ["dns", "tcp", "tls", "http", "http/2", "http/3", "quic", "latency", "networking"],
    outcomes: ["Walk a request from URL to response and count the round trips", "Explain how DNS caching and TTL affect failover", "Compare HTTP/1.1, HTTP/2 and HTTP/3"],
    next: "TCP carries the whole journey. Next: how it keeps data in order, avoids overloading the network, and where it stalls.",
  },
  {
    slug: "tcp-in-depth", dir: "06-tcp-in-depth", order: 6, group: "Networking",
    title: "TCP in Depth: Flow Control, Congestion Control and Loss", short: "TCP in depth",
    summary: "How TCP keeps data ordered and the network healthy: windows, slow start, retransmission, head-of-line blocking and TIME_WAIT.",
    minutes: 25, tags: ["tcp", "flow control", "congestion control", "slow start", "retransmission", "time_wait", "head-of-line blocking", "networking"],
    outcomes: ["Separate flow control from congestion control", "Trace the congestion window through slow start, loss and recovery", "Explain TIME_WAIT and head-of-line blocking"],
    next: "TCP moves the bytes. Next: HTTP on top of it, and the API styles built over HTTP.",
  },
  {
    slug: "http-and-api-styles", dir: "07-http-and-api-styles", order: 7, group: "Networking",
    title: "HTTP and API Styles: Caching, REST, gRPC and GraphQL", short: "HTTP & API styles",
    summary: "What HTTP methods, status codes and caching headers promise, and when to pick REST, gRPC or GraphQL.",
    minutes: 20, tags: ["http", "rest", "grpc", "graphql", "etag", "caching", "idempotency", "n+1", "api design"],
    outcomes: ["Match HTTP methods and status codes to retry and caching rules", "Explain conditional requests with ETag and 304", "Choose between REST, gRPC and GraphQL and name the cost of each"],
    next: "Requests need identity. Next: cookies, sessions, JWT and CORS, then load balancers and proxies.",
  },
  {
    slug: "sessions-auth-proxies", dir: "08-sessions-auth-proxies", order: 8, group: "Networking",
    title: "Sessions, JWT, CORS, Load Balancers and Proxies", short: "Sessions & proxies",
    summary: "Where identity lives (cookies, sessions, JWT), what CORS really restricts, and how L4 and L7 balancers and proxies sit in front of servers.",
    minutes: 25, tags: ["cookie", "session", "jwt", "cors", "csrf", "load balancer", "l4", "l7", "reverse proxy", "networking"],
    outcomes: ["Choose between cookie sessions and JWTs and say what revoking costs", "Explain preflight and why CORS protects browsers, not servers", "Tell L4 from L7 balancing and a forward proxy from a reverse proxy"],
    next: "That covers the network. Next, the database: what an index really costs, and B-trees against LSM-trees.",
  },
  {
    slug: "indexes-btree-lsm", dir: "09-indexes-btree-lsm", order: 9, group: "Databases internals",
    title: "Indexes: B-trees, LSM-trees and Query Plans", short: "Indexes",
    summary: "What an index costs, how a B-tree and an LSM-tree each find and store data, how composite and covering indexes work, and how to read a plan.",
    minutes: 25, tags: ["index", "b-tree", "lsm tree", "bloom filter", "composite index", "covering index", "query plan", "explain", "databases"],
    outcomes: ["Explain what an index costs on writes, disk and memory", "Compare B-tree and LSM-tree read and write paths", "Order a composite index and read an EXPLAIN plan"],
    next: "Indexes make single queries fast. Next: what a transaction promises when many run at once.",
  },
  {
    slug: "transactions-isolation", dir: "10-transactions-isolation", order: 10, group: "Databases internals",
    title: "Transactions: ACID, Isolation Levels, MVCC and Locks", short: "Transactions",
    summary: "What each ACID letter is built from, the anomalies isolation levels allow, how MVCC and locks work, and why write skew needs serializable.",
    minutes: 25, tags: ["transaction", "acid", "isolation level", "mvcc", "snapshot isolation", "write skew", "deadlock", "locks", "databases"],
    outcomes: ["Name the mechanism behind each ACID property", "Match isolation levels to the anomalies they allow", "Explain MVCC, write skew and when to use serializable"],
    next: "Next, the layer under transactions: the write-ahead log, checkpoints and crash recovery.",
  },
  {
    slug: "storage-engine-wal", dir: "11-storage-engine-wal", order: 11, group: "Databases internals",
    title: "Storage Engine: WAL, Checkpoints and Crash Recovery", short: "WAL & recovery",
    summary: "Why databases log before they write, how a commit becomes durable, what recovery replays, and how the same log drives replication.",
    minutes: 20, tags: ["wal", "write-ahead log", "fsync", "checkpoint", "crash recovery", "replication log", "group commit", "pitr", "databases"],
    outcomes: ["State the write-ahead rule and trace a commit", "Explain checkpoints and what recovery redoes and discards", "Compare synchronous and asynchronous log shipping"],
    next: "Last: how data is laid out in the first place, normalization against denormalization, and how joins run.",
  },
  {
    slug: "schema-and-joins", dir: "12-schema-and-joins", order: 12, group: "Databases internals",
    title: "Schema Design, Normalization and Joins", short: "Schema & joins",
    summary: "Store each fact once, copy it on purpose when reads demand it, and understand how nested-loop, hash and merge joins pay for the match.",
    minutes: 20, tags: ["normalization", "denormalization", "3nf", "join", "hash join", "nested loop", "merge join", "foreign key", "schema design", "databases"],
    outcomes: ["Explain update anomalies and the first three normal forms", "Decide when denormalizing is justified and how to keep copies correct", "Compare nested-loop, hash and merge joins and choose a join type"],
    next: "",
  },
];

export const getCsLesson = (slug: string) => csLessons.find((l) => l.slug === slug);
