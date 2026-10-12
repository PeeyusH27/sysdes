import type { Short } from "./types";

// Building blocks: distributed systems (coordination, time, transactions, failure). See building-blocks.ts for the format.
export const shorts: Short[] = [
  {
    id: "gossip-protocol",
    track: "Building blocks",
    topic: "Gossip",
    title: "Tell a few random peers each second, and soon every node knows",
    hook: "Every node in a cluster needs to know who's alive, without a central server that can fail or become a bottleneck.",
    points: [
      "Every second or so, each node picks **a few random peers** and swaps what it knows: members, heartbeats, versions.",
      "Each entry carries a **version number**, so a merge keeps the newer one and old news never overwrites new.",
      "News spreads like a rumour and reaches **every node in O(log n) rounds**: 100x the nodes costs only a few more rounds.",
      "Each node sends a fixed few messages per round, so its load stays flat as the cluster grows. There's **no leader** to lose.",
      "It's **eventually consistent**: for a few rounds, different nodes hold different views of the cluster.",
    ],
    more: [
      {
        title: "Where it's used",
        points: [
          "**Cassandra** gossips node state and schema versions every second with up to three other nodes.",
          "**Consul** agents gossip through Serf, which is built on the **SWIM** protocol, for membership and failure detection.",
          "**Redis Cluster** nodes gossip over a cluster bus to share slot ownership and reports of failed nodes.",
          "Amazon's **Dynamo** paper used gossip to spread membership changes around the ring.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Gossip can't settle what everyone must agree on now, like who leads. Consul gossips membership but uses **Raft** for its catalog.",
          "State grows with the cluster, so nodes first swap **digests** (node, version) and then send only what the other lacks.",
          "A removed node can be gossiped **back to life** by a peer with a stale view, unless removals are versioned too.",
        ],
      },
    ],
    code: `function gossipRounds(n, fanout = 3) { // node 0 has news to spread
  const knows = new Set([0]);
  const randomPeer = () => Math.floor(Math.random() * n);
  for (let round = 1; ; round++) {
    const sends = knows.size * fanout; // everyone who knows tells 3
    for (let i = 0; i < sends; i++) knows.add(randomPeer());
    if (knows.size === n) return round;
  }
}
gossipRounds(1_000); // about 8; with 100_000 nodes, about 13`,
    say: "For membership in a large cluster I'd use gossip: each node swaps state with a few random peers every second, so news reaches everyone in O(log n) rounds with no central server. Leadership still goes through Raft.",
  },
  {
    id: "failure-detection",
    track: "Building blocks",
    topic: "Failure detection",
    title: "A dead node and a slow one look exactly the same from outside",
    hook: "Failover, leader election and load balancing all start by declaring a node dead, and that verdict is always a guess.",
    points: [
      "Nodes send a **heartbeat** every second or so. If none arrives within a **timeout**, the node is suspected dead.",
      "Silence could be a crash, a long GC pause, an overloaded node or a **broken network**. From outside you can't tell which.",
      "A **short timeout** detects failures fast, but false alarms trigger failovers and rebalancing that add load at the worst time.",
      "A **long timeout** raises fewer false alarms, but traffic keeps flowing to a dead node until it fires.",
      "Some verdicts will be wrong: a node declared dead may still be running, so **fence** it before anything takes over.",
    ],
    more: [
      {
        title: "Phi accrual detectors",
        points: [
          "Instead of a yes or no, a **phi accrual** detector outputs a suspicion level from the heartbeat gaps it has observed.",
          "Phi is −log10 of the chance a healthy node's heartbeat is this late: **phi 3** means about 0.1%, phi 8 one in 100 million.",
          "On a jittery network the usual gap is longer, so the same silence raises phi more slowly. The detector **adapts**.",
          "**Cassandra** and **Akka** use phi accrual detectors, and both default to a threshold of 8.",
        ],
      },
      {
        title: "In practice",
        points: [
          "Act only after **several missed heartbeats**, or when a quorum of observers agrees, so one blip doesn't trigger a failover.",
          "When a direct ping fails, **SWIM** (Consul, Serf) asks a few other nodes to ping the suspect, so one bad link can't condemn it.",
          "A Raft follower's **election timeout** is its failure detector: no heartbeat from the leader in time, start an election.",
        ],
      },
    ],
    code: `// Phi accrual, simplest model: heartbeat gaps are exponential
function phi(msSinceLast, gaps) { // gaps: recent intervals in ms
  const mean = gaps.reduce((a, b) => a + b) / gaps.length;
  return msSinceLast / (mean * Math.LN10); // -log10(P(this late))
}
phi(1_000, [1_000, 1_000]); // 0.43: on time
phi(7_000, [1_000, 1_000]); // 3.04: a 0.1% chance it's just late
phi(7_000, [3_000, 4_000]); // 0.87: normal on a slow network`,
    say: "I'd send heartbeats and declare a node dead only after several misses, or past a phi accrual threshold. A slow node can look dead, so whatever takes over must fence the old one first.",
    source: "/learn/api-load-balancing#health-checks",
  },
  {
    id: "raft-leader-election",
    track: "Building blocks",
    topic: "Raft",
    title: "How Raft picks one leader, and why a write needs a majority",
    hook: "etcd, Consul and CockroachDB keep their replicas in agreement through crashes and partitions with Raft. The core fits on one card.",
    points: [
      "Time is split into numbered **terms**, each with at most one leader. A node that sees a higher term steps down.",
      "Followers expect heartbeats. After a **random 150–300 ms** of silence, one becomes a candidate and asks for votes.",
      "Each node votes once per term, and a candidate needs a **majority**. Two majorities always overlap, so only one can win.",
      "The leader appends each client command to its **log** and replicates it to the followers.",
      "An entry is **committed** once a majority stores it, so it survives the loss of any minority of nodes.",
    ],
    more: [
      {
        title: "Why it's safe",
        points: [
          "A node votes only for a candidate whose log is **at least as up to date** as its own, so a new leader has every committed entry.",
          "Random timeouts mean one node usually times out first and wins before others start. A **split vote** simply retries.",
          "An old leader cut off in a minority can't commit anything. When it rejoins, it sees the higher term and **steps down**.",
          "Its uncommitted entries are overwritten by the new leader's log, and clients retry, so make commands **idempotent**.",
        ],
      },
      {
        title: "Where it's used",
        points: [
          "**etcd** (all of Kubernetes' state), Consul servers, Kafka KRaft, and CockroachDB and TiKV, which run Raft per data range.",
          "Every write goes through the leader, so one group's writes are capped by one machine. Scale out with **many groups**.",
          "The Raft paper suggests 150–300 ms timeouts. etcd defaults to a 100 ms heartbeat and a **1 s election timeout**.",
        ],
      },
    ],
    code: `const majority = (n) => Math.floor(n / 2) + 1; // 2 of 3, 3 of 5
// The highest log index a majority stores (the leader counts too)
function commitIndex(matchIndex) {
  const sorted = [...matchIndex].sort((a, b) => b - a);
  return sorted[majority(sorted.length) - 1];
}
commitIndex([7, 7, 5, 4, 3]); // 5: three of five nodes have entry 5
// Raft also requires that entry to be from the leader's current term`,
    say: "I'd keep coordination state in etcd, which runs Raft: one leader per term, elected by a majority, and a write commits once a majority stores it. Three nodes survive one failure, five survive two.",
    source: "/learn/consistency-cap#consensus",
  },
  {
    id: "split-brain",
    track: "Building blocks",
    topic: "Split brain",
    title: "Two leaders after a network split: how quorums prevent it",
    hook: "If both sides of a partition accept writes, the data diverges, and merging it later can lose orders or sell a seat twice.",
    points: [
      "A partition cuts the cluster in two. With naive failover, each side thinks the other died and **promotes its own leader**.",
      "The fix: a node may lead only with votes from a **majority of the whole cluster**, and only one side can have that.",
      "The minority side **stops taking writes** until the network heals. Its reads are refused or may be stale.",
      "Use **odd sizes**: 3 nodes tolerate 1 failure and 5 tolerate 2. A 4th node adds cost but tolerates no more than 3.",
      "An old leader may not know it was replaced, so storage rejects its writes with a **fencing token**.",
    ],
    more: [
      {
        title: "Why 2 nodes are dangerous",
        points: [
          "With 2 nodes the majority is 2, so losing either node, or just the link between them, **stops writes**.",
          "If each node instead takes over when it can't see the other, a broken link gives you **two primaries**.",
          "Add a third voter that holds no data, such as a **MongoDB arbiter** or a quorum witness, to break the tie.",
        ],
      },
      {
        title: "Other defences",
        points: [
          "**STONITH**: power off the old primary, or cut its network or storage access, before promoting a new one.",
          "Spread 3 nodes over **3 zones**, so losing a whole zone still leaves a majority.",
          "**Leases**: a leader serves only until its lease expires, and a new one waits it out. This assumes clocks drift only a little.",
        ],
      },
    ],
    code: `const majority = (n) => Math.floor(n / 2) + 1;
const tolerates = (n) => n - majority(n); // failures it survives
[2, 3, 4, 5].map(tolerates); // [0, 1, 1, 2]
// Split 5 nodes into 3 + 2: only the side with 3 can elect a leader
const canLead = (side, n) => side >= majority(n);
canLead(3, 5); canLead(2, 5); // true, false`,
    say: "I'd run 3 or 5 nodes across zones and require a majority to lead, so only one side of a partition can. The old leader is fenced with an increasing token. Never 2 nodes without a tiebreaker.",
    source: "/learn/databases-scaling#failover",
  },
  {
    id: "lamport-vector-clocks",
    track: "Building blocks",
    topic: "Logical clocks",
    title: "Server clocks drift, so order events with counters instead",
    hook: "If one server's clock runs a few milliseconds fast, its writes look newer, and last-writer-wins silently keeps the wrong one.",
    points: [
      "NTP keeps clocks roughly in sync, often within milliseconds, but they drift and can jump. They **can't order** close events.",
      "**Lamport clock**: each node keeps a counter, adds 1 on every event, and sends the counter with every message.",
      "On receiving, set it to `max(local, received) + 1`. If A happened before B, A's number is **smaller**.",
      "The reverse doesn't hold: a smaller number doesn't prove A came first. Lamport clocks can't spot **concurrent** writes.",
      "**Vector clock**: one counter per node. If each vector is ahead in some slot, neither saw the other: they're **concurrent**.",
    ],
    more: [
      {
        title: "In Dynamo-style stores",
        points: [
          "The Dynamo paper and Riak attach a vector clock to each value and keep concurrent versions as **siblings**.",
          "The next read returns every sibling and the app merges them. Dynamo's shopping cart took the **union** of the versions.",
          "A union merge can **bring back** a deleted item, as the Dynamo paper notes for the cart.",
          "**Cassandra** skips all this: each cell has a timestamp, and the latest write wins.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A vector grows with the number of writers. Dynamo dropped the oldest entry once a clock reached about **10 entries**.",
          "Vector clocks **detect** conflicts; they don't resolve them. Something still has to merge, such as app logic or a CRDT.",
          "**Hybrid logical clocks** (CockroachDB) combine wall time with a counter: close to real time, and they respect causality.",
        ],
      },
    ],
    code: `function compare(a, b) { // a, b: { nodeId: counter }
  let less = false, more = false;
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[id] ?? 0) < (b[id] ?? 0)) less = true;
    if ((a[id] ?? 0) > (b[id] ?? 0)) more = true;
  }
  if (less && more) return "concurrent"; // keep both as siblings
  return less ? "before" : more ? "after" : "equal";
}
compare({ A: 2, B: 1 }, { A: 1, B: 2 }); // "concurrent"`,
    say: "I wouldn't order writes from different servers by timestamp, since clocks skew. In a leaderless store I'd use vector clocks so concurrent writes become siblings the app merges, or a CRDT where one fits.",
    source: "/learn/consistency-cap#conflict-resolution",
  },
  {
    id: "crdts",
    track: "Building blocks",
    topic: "CRDTs",
    title: "Edit any replica, even offline, and they still converge",
    hook: "Multi-region writes and offline apps need replicas that accept writes without asking anyone, then agree without a human merging.",
    points: [
      "Each replica updates **its own copy** with no locks or coordination, then ships its state or operations to the others.",
      "The merge is **commutative, associative and idempotent**: any order, and any repeats, give the same result.",
      "**G-counter**: one slot per replica. Each increments its own slot, merge keeps the max per slot, and the value is the sum.",
      "**PN-counter**: two G-counters, one for increments and one for decrements. The value is P minus N.",
      "**LWW-register**: keep the value with the highest timestamp. Simple, but the other concurrent write is **silently lost**.",
    ],
    more: [
      {
        title: "Sets and text",
        points: [
          "**OR-set**: each add gets a unique tag, and a remove deletes only the tags it has seen, so a concurrent add **survives**.",
          "That suits a cart: an item added on your phone isn't lost to a remove made on your laptop at the same moment.",
          "**Sequence CRDTs** give every character a unique id, so concurrent edits merge in the same order on every replica.",
        ],
      },
      {
        title: "Where it's used",
        points: [
          "**Collaborative editing** and offline-first apps: Yjs and Automerge sync edits made on different devices.",
          "**Multi-region databases**: Redis Enterprise Active-Active and Riak's data types are built on CRDTs.",
          "Counters such as likes and views: each region increments its own slot, with no cross-region round trip per write.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "No coordination means **no invariants**: two regions can each sell the last item. Stock and balances need a strong check.",
          "Metadata grows: tags, tombstones and per-replica slots pile up and need **compaction**.",
        ],
      },
    ],
    code: `// G-counter: one slot per replica; merge keeps each slot's max
const inc = (c, id) => ({ ...c, [id]: (c[id] ?? 0) + 1 });
function merge(a, b) {
  const out = { ...a };
  for (const id in b) out[id] = Math.max(out[id] ?? 0, b[id]);
  return out;
}
const value = (c) => Object.values(c).reduce((sum, n) => sum + n, 0);
const eu = inc(inc({}, "eu"), "eu"), us = inc({}, "us");
value(merge(eu, us)); // 3 in any order, merged once or twice`,
    say: "For a like counter written in several regions I'd use a CRDT counter: each region increments its own slot and merges keep the max per slot, so regions converge with no coordination. Stock needs a strong check.",
    source: "/learn/consistency-cap#conflict-resolution",
  },
  {
    id: "two-phase-commit",
    track: "Building blocks",
    topic: "2PC",
    title: "Atomic across databases, until the coordinator dies mid-commit",
    hook: "A transfer between two databases must debit and credit together. Two-phase commit does it, at the cost of held locks.",
    points: [
      "**Phase 1, prepare**: the coordinator asks each participant to do the work, make it durable, keep its locks and vote.",
      "A yes vote is a **promise**: the participant must still be able to commit, even after a crash and restart.",
      "**Phase 2**: if every vote is yes, the coordinator logs commit and tells everyone. Any no or timeout means abort.",
      "Locks are held from prepare until the decision arrives, so the **slowest participant** sets everyone's latency.",
      "If the coordinator dies after prepare, yes voters are **stuck**: they can't commit or abort on their own.",
    ],
    more: [
      {
        title: "Where it's used",
        points: [
          "**XA transactions** span databases and message brokers. Postgres exposes it as `PREPARE TRANSACTION` and `COMMIT PREPARED`.",
          "**Spanner** and CockroachDB run 2PC internally, with each participant a consensus group, so no single failure strands locks.",
          "It's rarely an option across microservices or third-party APIs: they don't speak the protocol. Use a **saga** there.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "The coordinator must log its decision **before** phase 2, so it can finish the job after a restart.",
          "A forgotten prepared transaction in Postgres **keeps its locks** and holds back vacuum until someone resolves it.",
          "Postgres turns it off by default: `max_prepared_transactions` is 0.",
        ],
      },
    ],
    code: `async function twoPhaseCommit(parts, txId) {
  const votes = await Promise.allSettled( // phase 1: lock and vote
    parts.map((p) => p.prepare(txId)));
  const yes = votes.every((v) => v.status === "fulfilled" && v.value);
  await log.append(txId, yes ? "COMMIT" : "ABORT"); // log it first
  // If we crash here, yes voters wait, still holding their locks
  await Promise.all(parts.map((p) => // phase 2: retried until acked
    yes ? p.commit(txId) : p.abort(txId)));
  return yes;
}`,
    say: "2PC gives an atomic commit across databases, but participants hold locks until the coordinator decides, and block if it dies. I'd use it only inside one database system, and a saga across services.",
    source: "/learn/consistency-cap#distributed-transactions-2pc-or-sagas",
  },
  {
    id: "saga-pattern",
    track: "Building blocks",
    topic: "Sagas",
    title: "No transaction spans services, so undo each step instead: sagas",
    hook: "Orders, stock and payments live in different services with their own databases, yet an order must never end up half done.",
    points: [
      "Split the action into **local transactions**, one per service: create the order, reserve stock, charge the card, ship.",
      "Pair each step with a **compensating action** that undoes it: cancel the order, release the stock, refund the card.",
      "If a step fails, run the compensations of the completed steps **in reverse order**.",
      "A compensation is a business undo, not a delete: a refund leaves a record, and a sent email can't be unsent.",
      "There's **no isolation**: others see intermediate states like PENDING, so design the UI and the reads for them.",
    ],
    more: [
      {
        title: "Orchestration or choreography",
        points: [
          "**Choreography**: each service reacts to the previous one's event. Loosely coupled, but the flow is hard to follow.",
          "**Orchestration**: a coordinator tells each service what to do next, so the flow, timeouts and retries live in one place.",
          "Choreography suits 2–3 steps. For longer flows, use an orchestrator such as **Temporal** or AWS Step Functions.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Compensations must be **idempotent** and retryable: a retried refund must not pay out twice.",
          "Put the steps most likely to fail first, and those you **can't undo**, like shipping, last.",
          "Persist the saga's progress, so a restarted orchestrator **resumes** instead of starting over.",
          "Publish each step's event through an **outbox**, so a crash can't silently stall the saga.",
        ],
      },
    ],
    code: `async function runSaga(steps, order) { // steps: [{ act, undo }, ...]
  let i = 0;
  try {
    for (; i < steps.length; i++) await steps[i].act(order);
  } catch (err) { // undo the completed steps, newest first
    while (i-- > 0) await steps[i].undo(order); // each idempotent
    throw err;
  }
}`,
    say: "Across the order, stock and payment services I'd run an orchestrated saga: each step a local transaction with an idempotent compensation, undone in reverse on failure, and the order shown as PENDING until done.",
    source: "/learn/async-messaging#sagas-transactions-across-services",
  },
  {
    id: "event-sourcing-cqrs",
    track: "Building blocks",
    topic: "Event sourcing",
    title: "Store every change as an event, and derive the state from them",
    hook: "An UPDATE overwrites history. Keeping the events instead gives you a full audit trail and lets you build new views later.",
    points: [
      "Append each change as an immutable **event**, such as `ItemAdded` or `OrderPaid`. Events are never updated or deleted.",
      "Current state is a **fold** over the events: replay them in order to rebuild an order, an account or a cart.",
      "Replaying thousands of events per read is slow, so save a **snapshot** every N events and replay only what follows.",
      "**CQRS** splits writes from reads: commands append events, and queries read **projections** shaped for each screen.",
      "Projections update asynchronously, so read models are **eventually consistent**: a write can take a moment to show.",
    ],
    more: [
      {
        title: "What you get",
        points: [
          "An **audit trail** for free: who changed what and when, which ledgers and regulated domains often need.",
          "**Time travel**: replay up to any point to see the state back then, or to debug how it went wrong.",
          "**New read models** later: replay the full history into a new projection for a feature nobody planned.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Two commands on one order can race. Append with an **expected version**, and retry if another write got there first.",
          "Events live forever, so changing their shape needs **versioning**, or upcasting old events as you read them.",
          "Erasing personal data is hard in an immutable log. Keep it outside the events, or encrypt it per user and delete the key.",
          "It's a lot of machinery. Use it where history matters, like money or orders, not for every CRUD table.",
        ],
      },
    ],
    code: `const apply = (balance, e) =>
  e.type === "Deposited" ? balance + e.amount : balance - e.amount;
const events = [{ type: "Deposited", amount: 100 },
  { type: "Withdrew", amount: 30 }, { type: "Deposited", amount: 5 }];
events.reduce(apply, 0); // 75: the balance now
events.slice(0, 2).reduce(apply, 0); // 70: the balance back then
const snap = { upTo: 2, balance: 70 }; // saved every N events
events.slice(snap.upTo).reduce(apply, snap.balance); // 75, faster`,
    say: "For a ledger I'd store events, not balances: the append-only log is the audit trail, snapshots keep replays fast, and CQRS projections serve the reads, a moment behind the writes.",
  },
  {
    id: "optimistic-vs-pessimistic-locking",
    track: "Building blocks",
    topic: "Locking",
    title: "Two users save the same record: lock it first, or check on write",
    hook: "Read, change, write: without a lock or a version check, the second save silently erases the first.",
    points: [
      "**Lost update**: two requests read stock = 5, each sells one and writes 4. Two items sold, but stock fell by one.",
      "**Pessimistic**: `SELECT … FOR UPDATE` locks the row, and anyone else locking it waits until your transaction ends.",
      "**Optimistic**: keep a `version` column and write `WHERE id = ? AND version = ?`. Zero rows updated means someone else won.",
      "On a conflict, **re-read and retry**, or show the user the newer version.",
      "Choose by **contention**: rare conflicts suit optimistic (no locks held), frequent ones suit pessimistic (no wasted retries).",
    ],
    more: [
      {
        title: "Trade-offs",
        points: [
          "A pessimistic lock lasts the whole transaction. Never hold one while waiting on a user or a slow API.",
          "Lock rows in a **consistent order**, or two transactions can deadlock. The database then aborts one of them.",
          "Optimistic works **across requests**: send the version to the client and back with the edit, like HTTP's `If-Match` with an ETag.",
          "Under heavy contention, optimistic retries pile up and most attempts become **wasted work**.",
        ],
      },
      {
        title: "Simpler still",
        points: [
          "One atomic statement needs neither: `UPDATE items SET stock = stock - 1 WHERE id = ? AND stock > 0`.",
          "DynamoDB **condition expressions** and Redis `WATCH` are optimistic checks too.",
        ],
      },
    ],
    code: `// Pessimistic: lock the row; others wait until this transaction ends
//   BEGIN; SELECT * FROM docs WHERE id = 7 FOR UPDATE; ...; COMMIT;
// Optimistic: no lock; the write checks that nobody changed the row
const { rowCount } = await db.query(
  \`UPDATE docs SET body = $1, version = version + 1
   WHERE id = $2 AND version = $3\`, [body, id, versionWeRead]);
if (rowCount === 0) throw new Error("Conflict: re-read and retry");`,
    say: "For a rarely contended record like a profile I'd use a version column and retry on conflict. For a hot row I'd lock with SELECT FOR UPDATE, or better, make the change one atomic conditional UPDATE.",
    source: "/learn/databases-scaling#transactions-and-isolation-levels",
  },
  {
    id: "service-discovery",
    track: "Building blocks",
    topic: "Service discovery",
    title: "Instances come and go all day. How does a caller find a live one?",
    hook: "Autoscaling, deploys and failed hosts keep changing instance addresses, so a hard-coded host list is always going stale.",
    points: [
      "Each instance **registers** its address with a registry when it starts, and deregisters when it shuts down.",
      "The registry runs **health checks**, or expects heartbeats, and drops instances that stop answering.",
      "**Client-side**: the caller fetches the healthy instances from the registry and load-balances across them itself.",
      "**Server-side**: the caller hits one stable address, a load balancer or proxy, which looks up the instances for it.",
      "**DNS-based**: a name resolves to the healthy instances. Simple and universal, but answers are cached until the **TTL** expires.",
    ],
    more: [
      {
        title: "Where it's used",
        points: [
          "**Kubernetes**: a Service gets a stable DNS name and virtual IP, and routes only to pods that pass their readiness check.",
          "**Consul** keeps a catalog with health checks and answers over DNS or HTTP.",
          "In etcd or ZooKeeper, an instance's entry is tied to a lease or session, so it **vanishes** when the instance stops renewing it.",
          "A **service mesh** sidecar such as Envoy intercepts calls and does discovery and load balancing for the app.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Resolvers and runtimes **cache DNS**, some for longer than the TTL. Keep TTLs short for anything that moves.",
          "The registry is critical: run it replicated (Consul and etcd use Raft), and let clients keep their **last known list** if it's down.",
          "On shutdown, deregister and **drain** first, or callers keep hitting an instance that's already gone.",
        ],
      },
    ],
    say: "On Kubernetes I'd call services by their Service DNS name and let readiness checks decide which pods get traffic. Elsewhere, a Consul registry with health checks, and clients caching the last good list.",
    source: "/learn/api-load-balancing#health-checks",
  },
  {
    id: "backpressure-load-shedding",
    track: "Building blocks",
    topic: "Backpressure",
    title: "An unbounded queue doesn't absorb overload, it just delays the crash",
    hook: "When work arrives faster than you finish it, something has to give. Choose what, or latency and memory choose for you.",
    points: [
      "1,000 requests a second in and 800 out grows the backlog by **200 a second**, until something breaks.",
      "**Bound every queue**. When it's full, the producer blocks, slows down or gets an error: that's **backpressure**.",
      "At the edge, **reject early** with `429` or `503` and `Retry-After`, before spending CPU on auth or the database.",
      "**Shed by priority**: drop prefetch and analytics first, and protect checkout and login.",
      "Skip queued work that's **past its deadline**: the client has already given up.",
    ],
    more: [
      {
        title: "Why unbounded fails",
        points: [
          "After an hour, 720,000 requests wait. At 800 a second, a new one waits **15 minutes**, long after its client timed out.",
          "Timed-out clients **retry**, adding load, until the queue exhausts memory.",
          "Serving everyone slowly means everyone times out: the servers run at 100% while **goodput** falls toward zero.",
        ],
      },
      {
        title: "Backpressure in practice",
        points: [
          "In Node.js streams, `write()` returns false when the buffer is full: wait for `drain` before writing more.",
          "TCP and HTTP/2 **flow control** stop a fast sender from overrunning a slow receiver.",
          "Kafka consumers **pull** at their own pace, so the backlog waits on disk in the log, not in a service's memory.",
          "Limit **concurrency**, not just rate, and autoscale consumers on queue depth or age, not CPU.",
        ],
      },
    ],
    code: `function admit(queue, job, max) { // false: answer 503 + Retry-After
  const limit = job.priority === "low" ? max * 0.8 : max;
  if (queue.length >= limit) return false; // low priority goes first
  queue.push({ ...job, deadline: Date.now() + 2_000 });
  return true;
}
function next(queue) { // skip jobs whose caller has already given up
  while (queue[0]?.deadline < Date.now()) queue.shift();
  return queue.shift();
}`,
    say: "I'd bound every queue and shed at the edge: a 503 with Retry-After once it's full, low-priority traffic first, and skip work past its deadline. An unbounded queue just turns overload into timeouts.",
    source: "/learn/async-messaging#backpressure-and-littles-law",
  },
];
