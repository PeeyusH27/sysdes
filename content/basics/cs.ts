import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "processes-threads": {
    what: "A process is a running program with its own private memory. A thread is one path of execution inside it. Threads in the same process share that memory, like people sharing a house but each keeping their own bed.",
    why: "Sharing makes threads cheap to switch between, but two of them can touch one variable at once and lose an update. Processes are isolated, so one crash leaves the others safe, but they cooperate more slowly.",
    example: "A house and its residents. The house has one address and one kitchen. The people share the kitchen but sleep in their own beds. A fire in the kitchen, like a crash in one thread, takes the whole house down.",
    when: "Pick processes when a failure must stay contained, threads when work shares state, and an event loop when work mostly waits. Past the core count, extra CPU-bound threads only add switching.",
  },
  "scheduling-memory": {
    what: "The scheduler decides which waiting task gets the CPU next. Virtual memory gives each program its own private set of addresses, which the system translates to real memory in fixed-size blocks called pages.",
    why: "A bad schedule lets a long job block short ones: for jobs of 24, 3 and 3 ms, average wait is 17 ms in arrival order but 3 ms shortest first. Virtual memory stops one program reading another's data.",
    example: "A hotel. Every guest is told to go to room 1, and the front desk maps that to a real room. A receptionist who gives each guest a few minutes in turn is round robin scheduling.",
    when: "Reach for it when a machine slows under load. Constant page faults from disk, called thrashing, mean the data in use does not fit in RAM. Name your scheduling goal first: throughput, response time or fairness.",
  },
  synchronization: {
    what: "A race condition is a wrong result caused by timing, when two threads touch the same data. A lock, called a mutex, lets one thread at a time into that code. Deadlock is when threads wait on each other forever.",
    why: "Without a lock, two awaiting increments of a counter give 1 instead of 2. Deadlock needs four conditions at once, so breaking any one prevents it, most cheaply by always taking locks in the same order.",
    example: "Two cooks need the knife and the board. One holds the knife and wants the board, the other holds the board and wants the knife. Neither moves. If both always grab the knife first, one simply waits.",
    when: "Keep locked sections small and never do slow I/O inside one. Prefer not sharing at all: immutable data, queues or atomics. Use a semaphore to allow N at a time, like 10 database connections.",
  },
  "concurrency-in-practice": {
    what: "Concurrency is structuring work as tasks that overlap, like one cook tending several pots. Parallelism is running them at the same instant on several cores. Pools, bounded queues, atomics and event loops are the tools.",
    why: "A thread per task is slow and unbounded, and an unbounded queue hides overload until memory runs out. Serial work also caps speedup: with 90 percent parallel work, no number of workers beats 10x.",
    example: "A restaurant kitchen with a fixed crew and a limited order rail. Cooks work through the orders. When the rail is full, waiters must wait before adding more. That slowing down of the source is backpressure.",
    when: "Size a pool from the work: about one thread per core for CPU-bound tasks, more when tasks wait on I/O. Use an event loop when work mostly waits, and never block it. Measure before adding workers.",
  },
  "request-journey": {
    what: "It is the sequence a browser runs before it can show a page. DNS finds the server's address from its name, TCP opens a reliable connection, TLS encrypts it, then HTTP asks for the page.",
    why: "Each stage costs at least one round trip. With a 50 ms round trip and nothing cached, the response takes 250 ms with TLS 1.2, 200 ms with TLS 1.3, and only 50 ms on a warm connection.",
    example: "Phoning a shop. Look up the number in a directory (DNS), dial and wait for an answer (TCP), agree on a private line (TLS), then ask your question (HTTP). On the next call you skip the lookup.",
    when: "Use it to explain a slow first byte and to answer what happens when you type a URL. Cut the cost by reusing connections, serving from a nearby CDN, and lowering DNS TTL before a planned move.",
  },
  "tcp-in-depth": {
    what: "TCP turns unreliable packets into an ordered, reliable stream by numbering bytes and resending lost ones. Flow control stops the sender swamping the receiver. Congestion control stops it swamping the network in between.",
    why: "A loss costs more than one resend: the window shrinks and later data waits behind the gap. A timeout is worse than three duplicate acknowledgements. One client can open only about 470 new connections a second to one destination.",
    example: "A water pipe. The sender opens the tap slowly, doubling the flow each round trip, and cuts back when the pipe overflows. Separately, the size of the receiver's bucket limits how much may be in flight.",
    when: "Reach for it when debugging stalls: check loss, window size and TIME-WAIT. Reuse connections with keep-alive or pools instead of tuning TIME-WAIT away. Small writes can stall 40 ms, so latency services set TCP_NODELAY.",
  },
  "http-and-api-styles": {
    what: "HTTP methods carry promises: a safe request changes nothing, and an idempotent one leaves the same result if repeated. REST exposes resources over HTTP, gRPC makes typed binary calls, and GraphQL lets the client pick fields.",
    why: "Networks fail after the server acted but before the client heard, so clients retry. Retrying a payment POST can charge twice. An idempotency key prevents that. Each API style also fixes one pain, like chatty round trips.",
    example: "A restaurant. Asking to see the menu is safe to repeat. Placing an order twice gets you two meals, unless the waiter checks your ticket number first. That ticket is an idempotency key.",
    when: "Use REST for browsers and partners, gRPC between your own services, and GraphQL when many screens need different fields. None is an upgrade: each adds tooling and its own failure modes, like N+1 queries.",
  },
  "sessions-auth-proxies": {
    what: "HTTP forgets you between requests, so identity travels in a cookie holding a session ID, or in a signed token called a JWT. A load balancer or proxy sits in front of the servers and routes requests to them.",
    why: "Sticky sessions pin a user to one server, so load spreads unevenly and a crash loses those sessions. A JWT cannot be revoked before it expires. A session ends instantly but needs a lookup on each request.",
    example: "A cloakroom ticket versus a wristband. A session is a ticket number that staff look up in a book. A JWT is a stamped wristband any door guard can check, but nobody can cancel until it expires.",
    when: "Keep servers stateless, with sessions in a shared store like Redis or short-lived JWTs. Set HttpOnly, Secure and SameSite on cookies. Choose L4 balancing for speed, and L7 to route by path or header.",
  },
  "indexes-btree-lsm": {
    what: "An index is a sorted structure that maps a column value to where its row lives, like the index of a book. A B-tree edits pages in place. An LSM-tree appends writes and merges sorted files later.",
    why: "Without an index, finding one row means scanning the whole table. With one, a lookup takes about log n steps: at 300 keys per page, three levels reach 27 million rows. The price is slower writes and more space.",
    example: "A textbook. Reading every page to find a word is a full scan. The index at the back lists the page numbers. But every time you add a page, the index must be updated as well.",
    when: "Index columns you filter, join and sort on, and check the query plan first. Skip tiny tables and low-selectivity columns. Choose a B-tree for read-heavy work and an LSM-tree for heavy writes.",
  },
  "transactions-isolation": {
    what: "A transaction groups changes so they all happen or none do. Isolation levels say how much concurrent transactions may see of each other. MVCC keeps old versions of rows so readers never block writers.",
    why: "Without enough isolation, two transactions can each read the same data and make a safe-looking change that together breaks a rule. That is write skew. Stronger levels prevent it, at the cost of aborts and retries.",
    example: "Two doctors are on call and at least one must stay. Each checks that two are on, then goes off call. Both succeed and nobody is left. Serializable isolation aborts one, which then retries.",
    when: "Use a transaction whenever several writes must succeed together, and keep it short. Pick the isolation level on purpose, since defaults differ by database. Retry the whole transaction after a deadlock.",
  },
  "storage-engine-wal": {
    what: "A write-ahead log is a file where the database first appends a small record of each change, before touching the main data pages. The rule is log before data. A checkpoint marks how far the data is safely on disk.",
    why: "Data pages sit in RAM and are flushed later, so a committed change could be lost in a crash. Flushing the log first keeps commits durable. Group commit shares one flush and can lift 500 commits a second to 50,000.",
    example: "A shopkeeper who writes every sale in a ledger before updating the shelves. After a power cut, the ledger since the last stock-take shows what to redo. A copy of the ledger can keep a second shop in sync.",
    when: "Think of it for crash recovery, replication and point-in-time restore. Choose synchronous replicas when losing no commit matters, asynchronous for speed. Alert on log disk size, because a full log stops writes.",
  },
  "schema-and-joins": {
    what: "Normalization stores each fact once, so updates cannot disagree with themselves. Denormalization copies facts on purpose to avoid joins. A join matches rows from two tables on a shared key.",
    why: "A customer's city repeated on every order must change everywhere, and missing one leaves the data contradicting itself. But joins cost time: 100 users and 1,000 orders need 100,000 comparisons by nested loop, about 1,100 by hash.",
    example: "A school keeps each student's address in one record, not on every report card. When they move, one edit fixes it. A printed summary with the address copied onto it reads faster but can go stale.",
    when: "Normalize first. Denormalize only a measured hot read, and say what keeps each copy correct. Use EXPLAIN to see which join ran. Store money as integer cents and use a join table for many-to-many.",
  },
};
