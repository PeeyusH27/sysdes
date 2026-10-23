import type { Short } from "./types";

// Shorts for the second batch of high-level design questions (content/questions). One or two per question,
// each linking to the section it summarises.
export const shorts: Short[] = [
  // ── Question: Web crawler ──────────────────────────────────────────────────
  {
    id: "crawler-url-frontier",
    track: "System design",
    topic: "Web crawler",
    title: "A crawler frontier is one queue per host plus a heap of ready times",
    hook: "A plain queue hands one site's thousands of URLs to every worker at once. The frontier's job is speed overall and gentleness per site.",
    points: [
      "**Front queues** rank URLs by importance. **Back queues** keep one queue per host, so a delay can be enforced for each site.",
      "A min-heap of `ready at` times says which host may be fetched next. A host leaves the heap while a fetch is in flight.",
      "At a 10 s gap one host gives 0.1 page a second, so 386 pages a second needs about **3,860 hosts** in play.",
      "After each fetch the host rests for the larger of its `Crawl-delay` and ten times the fetch time. A 429 or 503 doubles it.",
    ],
    more: [
      {
        title: "How to scale it",
        points: [
          "Hash the host to pick the crawler node, so a host's queue, timer and robots cache live on one machine.",
          "Links to another node's hosts travel on a Kafka topic partitioned by host.",
          "Persist the frontier, so a restart loses no queued URLs.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Cap queued URLs per host. Calendars and session ids make endless new URLs that no seen-check catches.",
          "A blocking DNS lookup is the usual hidden bottleneck: cache it and resolve asynchronously.",
        ],
      },
    ],
    code: `next(now) {
  const top = ready.peek();
  if (!top) return { url: null };
  if (top.at > now) return { url: null, waitMs: top.at - now };
  ready.pop();                 // host is busy until done()
  return { url: hosts.get(top.host).takeBest() };
}`,
    say: "The frontier has priority queues in front and one queue per host behind, with a heap of ready-at times. A host is in flight for one fetch at a time, then rests, so we stay polite while other hosts keep workers busy.",
    source: "/questions/web-crawler#the-url-frontier",
  },
  {
    id: "crawler-seen-bloom-filter",
    track: "System design",
    topic: "Web crawler",
    title: "Remember 5 billion URLs in 6 GB with a Bloom filter",
    hook: "A crawler asks 'have I queued this URL?' for every link it finds. An exact set of hashes costs 40 GB; a Bloom filter costs about 6.",
    points: [
      "Normalize first: lower-case the host, drop fragments and tracking parameters, sort the query. One page, one string.",
      "A Bloom filter at 1% needs about **9.6 bits per URL** and 7 hashes. A 'no' is always right.",
      "A 'yes' is wrong about 1% of the time, so about 1 new URL in 100 is skipped. Another inbound link usually brings it back.",
      "Content needs its own check: an exact hash for identical pages, a **simhash** (a few bits apart) for near-duplicates.",
    ],
    more: [
      {
        title: "The arithmetic",
        points: [
          "Bits per item is `-ln(p) / (ln 2)^2`: 9.585 at 1%. For 5B URLs that is 5.99 GB.",
          "Exact 8-byte hashes: 5B × 8 B = 40 GB, about 6x more.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A Bloom filter cannot delete. Rebuild it by epoch from the page table when it fills.",
          "Partition it by host, like the frontier, so each node owns its slice.",
        ],
      },
    ],
    code: `const { bits, hashes } = bloomSize(5e9, 0.01);
// bits / 8 = 5.99e9 bytes, hashes = 7
if (filter.addIfNew(normalize(link, pageUrl))) {
  frontier.add(link, score(link));
}`,
    say: "I normalize each URL and test it in a Bloom filter. At 1% that is about 6 GB for 5 billion URLs instead of 40 GB exact, and it never misses a seen URL. I fingerprint content with a hash plus simhash for near-duplicates.",
    source: "/questions/web-crawler#seen-urls-and-duplicate-pages",
  },

  // ── Question: Video streaming ──────────────────────────────────────────────
  {
    id: "video-adaptive-bitrate",
    track: "System design",
    topic: "Video",
    title: "Adaptive bitrate: the player picks quality one segment at a time",
    hook: "A video that buffers loses the viewer. The fix is to cut it into short segments at several qualities and let the player choose.",
    points: [
      "Encode each video at a ladder of qualities (here 0.4, 0.8, 1.2, 2.5 and 5 Mbps), cut into **4-second segments** aligned across qualities.",
      "The player times each segment download and keeps a smoothed **throughput estimate**.",
      "It picks the best quality under **80%** of that estimate. At 4 Mbps measured, that is 720p, not 1080p.",
      "Down is fast, up is slow: a thin buffer steps down at once; stepping up needs a healthy buffer and goes one level at a time.",
    ],
    more: [
      {
        title: "Why it works",
        points: [
          "A master playlist lists the qualities; each quality has its own list of segments. The server stays dumb and cacheable.",
          "Segments are plain files, so any CDN can serve them over ordinary HTTP.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Without a safety margin, every small dip drains the buffer. Without hysteresis, quality flaps between two levels.",
          "Short segments adapt faster but add requests; long segments react slowly.",
        ],
      },
    ],
    code: `// best quality whose bitrate fits 80% of throughput
let target = 0;
for (let i = 0; i < ladder.length; i++)
  if (ladder[i].bps <= throughputBps * 0.8) target = i;
if (bufferS < 5 && current > 0) return Math.min(target, current - 1);
if (target > current) return bufferS >= 12 ? current + 1 : current;
return target;`,
    say: "The player downloads short segments, estimates throughput, and picks the best quality under 80% of it. It drops fast when the buffer is thin and climbs one step at a time. The server just serves cacheable files.",
    source: "/questions/video-streaming#adaptive-bitrate",
  },
  {
    id: "video-transcoding-tasks",
    track: "System design",
    topic: "Video",
    title: "Transcode a video as 750 small idempotent tasks",
    hook: "One long encode is slow and restarts from zero when it fails. Splitting by segment and quality makes the work parallel and retryable.",
    points: [
      "Cut a 10 minute video into 150 four-second segments. Five qualities make **750 encode tasks**, then one task writes the playlists.",
      "Each task reads the same source and writes a path from video, quality and index, so running it twice is harmless.",
      "A coordinator gives tasks leases. If a worker stops heartbeating, the lease expires and another worker takes the task.",
      "A day of uploads (500K videos, 10 minutes, 5 qualities, 2x realtime per core) needs about **8,700 cores**.",
    ],
    more: [
      {
        title: "Uploads feeding it",
        points: [
          "Clients send 8 MiB chunks straight to object storage. 500 MiB is 63 chunks.",
          "After a failure the client asks how many bytes arrived in order and continues from there.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A corrupt source fails every attempt: cap retries, mark the video FAILED with a reason, tell the creator.",
          "Show a video only when the status is READY, after the playlists exist.",
        ],
      },
    ],
    code: `for (const r of ladder)
  for (let i = 0; i < segments; i++)
    tasks.push({ id: \`\${v}/\${r.label}/\${i}\`, from: i * 4,
      out: \`v/\${v}/\${r.label}/seg_\${i}.m4s\` });
tasks.push({ kind: 'package', after: tasks.map((t) => t.id) });`,
    say: "I split the job into segment-by-quality tasks, 750 for a 10 minute video. Tasks are idempotent with deterministic output paths and leases, so a dead worker just means a retry. A final task writes the playlists.",
    source: "/questions/video-streaming#upload-and-transcoding",
  },

  // ── Question: File storage and sync ────────────────────────────────────────
  {
    id: "file-sync-chunking-dedupe",
    track: "System design",
    topic: "File sync",
    title: "Name chunks by their hash: sync deltas, resume, dedupe",
    hook: "Uploading a whole file on every save is wasteful. Cut files into chunks named by content and most of that work disappears.",
    points: [
      "Split files into about **4 MiB chunks** and name each by its SHA-256. Same bytes, same name.",
      "The client sends hashes and asks 'which are new?', then uploads only those. One edit in a 1 GiB file is 1 of 256 chunks: **0.4%**.",
      "A broken upload resumes at the next unknown chunk. Identical chunks, even from different users, are stored once.",
      "With fixed boundaries, one inserted byte shifts every chunk. **Content-defined chunking** cuts where a rolling hash matches, so most hashes survive.",
    ],
    more: [
      {
        title: "The numbers",
        points: [
          "200 PB at 4 MiB is about 47.7 billion chunks; at 64 B each the chunk index is about 3 TB, sharded by hash.",
          "In a test, a 100-byte insert kept over 95% of content-defined chunks and under 5% of fixed ones.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Cross-user dedupe can reveal that someone else has a file: ask the client to prove it holds the bytes.",
          "Delete chunks only when the reference count is zero, after a grace period, so an in-flight commit cannot lose one.",
        ],
      },
    ],
    code: `const chunks = await fixedChunks(bytes);  // [{ hash, start, length }]
const hashes = chunks.map((c) => c.hash);
const need = await api.unknownChunks(hashes);
for (const c of chunks.filter((x) => need.includes(x.hash)))
  await api.putChunk(c.hash, slice(bytes, c));
await api.commit({ path, baseRev, chunks: hashes });`,
    say: "I cut files into 4 MiB chunks named by SHA-256, ask the server which hashes are new, and upload only those. That gives delta sync, resumable upload and dedupe. Content-defined chunking handles inserts.",
    source: "/questions/file-storage#chunking-and-dedupe",
  },
  {
    id: "file-sync-conflicts-cursors",
    track: "System design",
    topic: "File sync",
    title: "Sync with revisions and cursors; keep conflicts, never overwrite",
    hook: "Two offline devices edit the same file. A system that quietly picks a winner loses someone's work.",
    points: [
      "A file is a path, a revision number and an ordered list of chunk hashes. A commit names the **base revision** it started from.",
      "If the file is still at that revision, it moves to the next. If not, the commit is refused: a **conflict**.",
      "The loser saves a 'conflicted copy' as a new file, so nothing is lost or silently overwritten.",
      "Each accepted commit is appended to a per-user journal. Devices ask 'what changed since cursor N?', which is safe to repeat.",
    ],
    more: [
      {
        title: "Telling devices",
        points: [
          "An online device holds a connection to a notifier that sends a tiny poke; the device then pulls the journal.",
          "A lost poke only delays sync; a slow backstop poll and the cursor fix it. About 50M devices need ~1,000 notifier servers at 50K each.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Use cursors, not timestamps: clock skew between devices can hide a change.",
          "The metadata service must check every chunk exists before accepting a commit.",
        ],
      },
    ],
    code: `commit({ path, baseRev, chunks }) {
  const curRev = this.files.get(path)?.rev ?? 0;
  if (baseRev !== curRev) return { ok: false, conflict: true };
  // ... check chunks exist, save rev + 1, append to the journal
  return { ok: true, rev: curRev + 1 };
}`,
    say: "Commits carry a base revision, and a stale one is a conflict: the client keeps its work as a conflicted copy. Every commit goes into a per-user journal, and devices catch up with a cursor after a small poke.",
    source: "/questions/file-storage#sync-and-conflicts",
  },

  // ── Question: Distributed key-value store ──────────────────────────────────
  {
    id: "kv-store-quorums",
    track: "System design",
    topic: "Key-value store",
    title: "Quorums: pick W and R so a read always meets the latest write",
    hook: "A leaderless store keeps each key on N nodes. How many must answer decides how fresh your reads are, and how many failures you survive.",
    points: [
      "Keep each key on **N = 3** nodes. A write succeeds after **W** acks; a read asks **R** replicas and takes the newest.",
      "If **R + W > N**, every read set overlaps every write set, so a read sees the latest acknowledged write.",
      "W = 2, R = 2 survives one dead replica. W = 1, R = 1 is fastest but can read stale: a random read misses a random write 2 times in 3.",
      "W = 3 blocks writes when any one node is down; W = 1, R = 3 makes reads slow. Choose per request.",
    ],
    more: [
      {
        title: "Staying available",
        points: [
          "A sloppy quorum plus hinted handoff lets a stand-in node hold writes for a down replica and hand them over later.",
          "Read repair: when a read sees a stale replica, the coordinator writes the newest version back to it.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Quorums alone are not linearizable: concurrent writes and sloppy quorums can still return old data.",
          "Strong consistency needs a consensus group such as Raft per key range, at the cost of some availability.",
        ],
      },
    ],
    say: "Each key is on three nodes. I write with W = 2 and read with R = 2, so R + W above N makes every read overlap the last write, and one node can be down. Lower W or R trades freshness for speed per request.",
    source: "/questions/key-value-store#replication-and-quorums",
  },
  {
    id: "kv-store-vector-clocks-repair",
    track: "System design",
    topic: "Key-value store",
    title: "Vector clocks find conflicts; Merkle trees find drift",
    hook: "With no leader, two clients can write one key at once, and replicas drift apart. Two small structures handle both.",
    points: [
      "A **vector clock** is a map of node to counter. If one clock includes the other, keep the newer version.",
      "If neither includes the other, the writes were **concurrent**: keep both as siblings and let the client merge them.",
      "**Last-write-wins** picks one by timestamp. It is simple, but clock skew can silently drop the newer write.",
      "**Merkle trees** let two replicas find differing keys: compare root hashes, then walk only the mismatching branches.",
    ],
    more: [
      {
        title: "How much work",
        points: [
          "With 1,024 leaves, a single stale key is found in 21 comparisons: the root, then two children at each of 10 levels.",
          "Only the keys in the mismatching leaf are copied.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A delete must be stored as a tombstone and kept past the repair interval, or repair brings the value back.",
          "Clocks grow with the number of writers; real systems prune old entries.",
        ],
      },
    ],
    code: `compare({ A: 2 }, { A: 1, B: 1 });   // 'concurrent'
compare({ A: 2 }, { A: 1 });         // 'after'
const merged = merge({ A: 2 }, { A: 1, B: 1 });   // { A: 2, B: 1 }
siblings([v1, v2, v3]);              // drops superseded versions`,
    say: "Writes carry vector clocks. If one supersedes the other we keep the newer; if they are concurrent we return both siblings for the client to merge. Background Merkle-tree comparison repairs replicas that drifted.",
    source: "/questions/key-value-store#conflicts-and-repair",
  },

  // ── Question: Unique id generator ──────────────────────────────────────────
  {
    id: "id-generator-snowflake-layout",
    track: "System design",
    topic: "ID generation",
    title: "Snowflake ids: 41 bits of time, 10 of worker, 12 of counter",
    hook: "Unique ids across many servers without asking a database each time: pack time, who made it, and a counter into one 64-bit number.",
    points: [
      "**1 + 41 + 10 + 12 bits**: sign, milliseconds since a custom epoch, worker id, per-millisecond sequence.",
      "41 bits of milliseconds last **69.7 years**. 12 bits allow **4,096 ids per ms**, so 4.096M a second per worker.",
      "10 bits allow **1,024 workers**. Two workers can never collide because their worker bits differ.",
      "Ids sort by time, so inserts append to the end of a B-tree index, unlike random UUID v4.",
    ],
    more: [
      {
        title: "How a generator works",
        points: [
          "Read the clock. Same millisecond as the last id: increment the sequence. New millisecond: reset it to 0.",
          "If the sequence overflows, wait for the next millisecond.",
          "Lease worker ids from etcd or ZooKeeper with a TTL, and stop issuing ids shortly before the lease ends.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Ids are roughly time-ordered across servers, not strictly: clocks differ by milliseconds.",
          "Ids go up to 2^63, beyond JavaScript's 2^53 exact integers: send them as strings in JSON.",
        ],
      },
    ],
    code: `// layout: time(41) | worker(10) | sequence(12)
const id = (ts << 22n) | (worker << 12n) | seq;
const time = Number((id >> 22n) + EPOCH);
const wk   = Number((id >> 12n) & 1023n);
const sq   = Number(id & 4095n);`,
    say: "I'd use Snowflake-style 64-bit ids: 41 bits of time, 10 of worker, 12 of sequence, made locally, up to 4,096 per ms. Workers lease their ids with a TTL, and the generator refuses to run if the clock steps back.",
    source: "/questions/unique-id-generator#the-snowflake-layout",
  },
  {
    id: "id-generator-clock-skew",
    track: "System design",
    topic: "ID generation",
    title: "When the clock goes backwards, a Snowflake generator must stop",
    hook: "NTP can step a clock back. An earlier timestamp with the same worker and sequence can repeat an id, and a duplicate key corrupts data.",
    points: [
      "Remember the last timestamp used. If `now` is earlier, the clock moved back.",
      "A tiny step (a few ms) is **waited out**: spin until the clock catches up, and ids stay increasing.",
      "A large step is **refused**: raise an alert and fail over to another instance. A short error beats a duplicate.",
      "Prefer NTP slewing (gradual correction) to stepping, and keep every clock monitored for drift.",
    ],
    more: [
      {
        title: "Two related risks",
        points: [
          "Two live servers with the same worker id also repeat ids: lease worker ids and stop before the lease ends.",
          "A crash only wastes the sequence numbers it had not used. Gaps are fine; duplicates are not.",
        ],
      },
      {
        title: "Alternatives",
        points: [
          "Ticket servers hand out blocks of a database counter, in odd and even pairs: no clocks, but a round trip per block.",
          "UUID v7 puts a 48-bit millisecond timestamp ahead of random bits: sortable and coordination-free, at 128 bits.",
        ],
      },
    ],
    code: `if (ts < last) {
  const behind = last - ts;
  if (behind > maxBackwardMs) throw new Error('clock moved back');
  while (ts < last) ts = now() - EPOCH;   // wait out a small step
}`,
    say: "If the clock moves back a few milliseconds I wait it out; a big step makes the generator refuse and alert, because a duplicate primary key is worse than a short error.",
    source: "/questions/unique-id-generator#clocks-workers-and-failure",
  },

  // ── Question: Collaborative editor ─────────────────────────────────────────
  {
    id: "docs-operational-transform",
    track: "System design",
    topic: "Collaborative editing",
    title: "Operational transform: rewrite the later edit to fit the earlier",
    hook: "Two people edit 'cat' at once: one adds an s, one deletes the c. Positions go stale, so plain edits would break the text.",
    points: [
      "Show each edit locally **at once**, and send it with the revision it was based on.",
      "A server owns the document, gives every accepted edit the next revision, and **transforms** it past edits the sender had not seen.",
      "'cat': A inserts s at 3, B deletes position 0. B's delete stays at 0; A's insert becomes position 2 for B. Both end on 'ats'.",
      "Each client keeps **one edit in flight** and transforms incoming edits past its pending ones, so typing never waits.",
    ],
    more: [
      {
        title: "Durability",
        points: [
          "An edit is acknowledged only after it is appended to the operation log. The log is the truth and the version history.",
          "Snapshot every few hundred edits. Recovery is the latest snapshot plus the log tail, at most about 500 operations.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Transform functions are subtle: test that random pairs of operations converge in both orders.",
          "Give edits ids so a retry after a crash is not applied twice.",
        ],
      },
    ],
    code: `if (a.type === 'insert' && b.type === 'delete')
  return a.pos <= b.pos ? a : { ...a, pos: a.pos - 1 };
if (a.type === 'delete' && b.type === 'insert')
  return a.pos < b.pos ? a : { ...a, pos: a.pos + 1 };`,
    say: "Each edit carries the revision it started from. A session server per document transforms it past newer edits, appends it to a log and broadcasts it. Clients echo locally and keep one edit in flight.",
    source: "/questions/collaborative-editor#operational-transform",
  },
  {
    id: "docs-crdt-tombstones",
    track: "System design",
    topic: "Collaborative editing",
    title: "CRDT text: give every character an id and never rewrite edits",
    hook: "A CRDT merges edits in any order with no central server, which suits offline editing. The cost is memory.",
    points: [
      "Every character has a permanent **id** (counter and site). An insert says 'after character X'.",
      "A delete only marks the character dead: a **tombstone**. Late inserts that refer to it still find their place.",
      "Concurrent inserts at one spot are ordered by id, the same on every replica, so all copies converge.",
      "Operations arriving out of order wait until their parent character exists, then apply. Duplicates are harmless.",
    ],
    more: [
      {
        title: "OT or CRDT?",
        points: [
          "OT: compact, needs a central server to order edits, and transform functions are subtle.",
          "CRDT: works peer-to-peer and offline, but ids and tombstones grow until the document is compacted.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "An emptied document may still remember every deleted character: plan compaction.",
          "Rich text needs attributes on characters, which add more state to merge.",
        ],
      },
    ],
    code: `// insert after the node with id op.after
let i = at + 1;
while (i < nodes.length && cmp(nodes[i].id, op.id) > 0) i++;
nodes.splice(i, 0, { id: op.id, ch: op.ch, dead: false });`,
    say: "A CRDT gives each character an id, so inserts say 'after X' and deletes become tombstones. Edits merge in any order, which is ideal offline, at the price of memory until compaction.",
    source: "/questions/collaborative-editor#crdts-as-the-alternative",
  },

  // ── Question: Proximity service ────────────────────────────────────────────
  {
    id: "proximity-geohash-cells",
    track: "System design",
    topic: "Nearby search",
    title: "Find places near me: pick the geohash length from the radius",
    hook: "Scanning 200 million businesses per search is impossible. A geohash turns 'near me' into a few indexed prefix lookups.",
    points: [
      "A **geohash** is a short string for a map cell. A longer string is a smaller cell, and a shared prefix means the same cell.",
      "In SQL it is an indexed column: `WHERE geohash LIKE '9q8yy%'` is a range scan.",
      "Use the **longest hash whose cells are at least as big as the radius**. Then the circle touches at most 3 x 3 = 9 cells.",
      "In San Francisco: 0.5 km uses 6 characters, 1 and 2 km use 5, 5 km uses 4, 20 km uses 3. Scan those cells, filter by exact distance, sort.",
    ],
    more: [
      {
        title: "Why the cover matters",
        points: [
          "A place across a cell edge can be nearer than most in your own cell, so reading only your cell misses results.",
          "Cells shrink toward the poles, so the width check uses cos(latitude).",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Density is uneven: a midtown cell can hold thousands of places while the next holds none.",
          "Cursor paging by distance and id keeps page two stable; offsets drift when data changes.",
        ],
      },
    ],
    code: `const { cells } = coveringCells(lat, lon, radiusKm);
const found = [];
for (const cell of cells)
  for (const row of rangeScan(cell))      // LIKE 'cell%'
    if (haversineKm(origin, row) <= radiusKm) found.push(row);
found.sort((a, b) => a.distKm - b.distKm);`,
    say: "I pick the longest geohash whose cells are at least the radius, scan the at most 9 covering cells with a prefix query, then filter by exact distance and sort. For uneven density I'd use a quadtree.",
    source: "/questions/proximity-service#geohash",
  },
  {
    id: "proximity-quadtree",
    track: "System design",
    topic: "Nearby search",
    title: "A quadtree splits the map only where places are dense",
    hook: "Manhattan and Montana need different cell sizes. A quadtree gives each area the size it needs.",
    points: [
      "Start with the whole map as one box. When a box holds more than about **100 businesses**, split it into four.",
      "Dense areas become many tiny leaves; empty areas stay as one big leaf. Every leaf stays small.",
      "Search visits only boxes that touch the circle's bounding box, then checks exact distances.",
      "200M businesses make about **2M leaves and 1.9 GB**: small enough for a full in-memory copy on every search server.",
    ],
    more: [
      {
        title: "Operating it",
        points: [
          "Rebuild nightly from the database and save a snapshot. A restarted server loads it and replays the change feed.",
          "Scale reads by adding copies. A search server answers any query alone.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Limit depth, or many identical points will split a leaf forever.",
          "If the index outgrows one machine's memory, move to S2 or H3 cells sharded by cell id.",
        ],
      },
    ],
    code: `insert(p) {
  let node = this.root;
  while (node.kids) node = this.childFor(node, p);
  node.points.push(p);
  if (node.points.length > 100 && node.depth < maxDepth)
    this.split(node);          // four children, redistribute points
}`,
    say: "A quadtree splits a box into four whenever it holds more than 100 businesses, so leaves adapt to density. 200 million places is about 2 GB, so I'd keep a full copy on each stateless search server.",
    source: "/questions/proximity-service#quadtree",
  },

  // ── Question: Distributed cache ────────────────────────────────────────────
  {
    id: "dcache-hit-ratio-sizing",
    track: "System design",
    topic: "Distributed cache",
    title: "Size a cache from the database's limit, not from a guess",
    hook: "A cache exists to protect something slower. The slow thing's limit tells you the hit ratio you need, and the node count follows.",
    points: [
      "Database serves 20K reads a second, traffic is 1M. Misses must be 20K or fewer, so the hit ratio must be **98%**.",
      "At 95%, 50K reads a second reach the database: 2.5 times its limit.",
      "Nodes by memory: 130 GB working set ÷ 24 GB usable = 6. By throughput: 1M ÷ 100K per node = 10, so run **12** with headroom.",
      "Lose one of 12 nodes and **8.3%** of keys miss: about 80K extra reads a second headed for a database that handles 20K.",
    ],
    more: [
      {
        title: "Routing",
        points: [
          "Hash mod N moves almost every key when N changes. Rendezvous or consistent hashing moves only about 1/N.",
          "Do the routing in the client library: one network hop on a hit, and no central router to scale.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Count memory in bytes, not entries, and add overhead for keys and pointers.",
          "After a restart, warm the cache gradually so the database is not flooded.",
        ],
      },
    ],
    say: "I derive the hit ratio from the database limit: 1M reads against 20K means 98%. Throughput sets the node count, about 12, and I shard in the client with rendezvous hashing so losing a node moves only 8% of keys.",
    source: "/questions/distributed-cache#capacity-estimate",
  },
  {
    id: "dcache-stampede-hot-key",
    track: "System design",
    topic: "Distributed cache",
    title: "Stampedes and hot keys: single flight and local copies",
    hook: "Two cache failures look like the cache working and still take the database down: everyone missing at once, and everyone asking one node.",
    points: [
      "A popular key expires and 1,000 requests miss together. **Single flight**: the first loads, the other 999 wait for that same load.",
      "Add up to 10% **jitter** to TTLs so keys written together do not expire together. Cache 'not found' for a few seconds too.",
      "A **hot key** lives on one node, so more nodes cannot help. Count requests per key and keep a copy in each app server for about a second.",
      "A stale fill: a slow reader fills the cache after a writer deleted the key. Use short TTLs, a delayed second delete, or versioned values.",
    ],
    more: [
      {
        title: "In tests",
        points: [
          "1,000 simultaneous misses cause exactly one database read.",
          "5,000 reads of a hot key cut to under 150 node reads with a one second local copy.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Do not cache failures: a failed load should be retried by the next request.",
          "Rate-limit the load path so a cold node or restart cannot flood the database.",
        ],
      },
    ],
    code: `async do(key, load) {
  const running = inflight.get(key);
  if (running) return running;       // join the load in progress
  const p = load().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}`,
    say: "Misses for one key go through single flight, so a stampede is one database read. TTLs are jittered, hot keys get a one second local copy, and writes delete the key with a delayed second delete against stale fills.",
    source: "/questions/distributed-cache#stampedes-hot-keys-and-stale-data",
  },

  // ── Question: Metrics and monitoring ───────────────────────────────────────
  {
    id: "metrics-tsdb-compression-rollups",
    track: "System design",
    topic: "Monitoring",
    title: "Metrics storage: compress neighbours, roll up the old",
    hook: "100K hosts reporting 100 metrics every 10 seconds make 1 million samples a second. Raw, that is 1.38 TB a day.",
    points: [
      "10M series every 10 s is **1M samples/s**. At 16 bytes each (timestamp and value) that is 1.38 TB a day.",
      "Timestamps follow a schedule, so the **delta of deltas** is nearly always 0: about 1 bit. Values change slowly, so XOR leaves few set bits.",
      "Facebook's Gorilla paper reports about **1.37 bytes** a sample on real data: roughly 118 GB a day here.",
      "Keep raw for 15 days, then 1-minute and 1-hour rollups of **min, max, sum, count**. About 10.6 TB covers two years.",
    ],
    more: [
      {
        title: "Percentiles",
        points: [
          "Averaging p99 values is wrong: a quiet minute counts like a busy one.",
          "Store a histogram per bucket (counts per latency range). Histograms add exactly, so any window's p99 is right.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Every distinct label set is a new series. A label like user_id with a million values multiplies cost by a million.",
          "Enforce series quotas per team, and alert when the series count jumps.",
        ],
      },
    ],
    say: "Neighbouring samples look alike, so delta-of-delta timestamps and XORed values give about 1.4 bytes a sample. I keep raw for two weeks, then min, max, sum and count rollups, and histograms for percentiles.",
    source: "/questions/metrics-monitoring#ingest-and-storage",
  },
  {
    id: "metrics-alert-state-machine",
    track: "System design",
    topic: "Monitoring",
    title: "Alerts are state machines: pending first, firing later",
    hook: "An alert that fires on every blip trains people to ignore pages. An alert that never fires is worse.",
    points: [
      "A rule moves **inactive, pending, firing, resolved**. The condition must hold for the whole `for` duration (say 5 minutes) before it fires.",
      "A 20-second spike goes pending and then back to inactive: nobody is paged.",
      "**Missing data counts as bad** by default, so a host that went silent alerts instead of looking healthy.",
      "The notifier groups related alerts: 30 hosts in one cluster make one page, with repeats suppressed for hours.",
    ],
    more: [
      {
        title: "Reliability",
        points: [
          "Run two evaluators, and a canary alert that must always fire. If it goes quiet, the pipeline is broken.",
          "Monitor the monitor with separate infrastructure, so an outage does not blind you.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A long for-duration means slower detection: use short ones for outages, longer ones for capacity warnings.",
          "Support silences for maintenance windows, or people will mute rules for good.",
        ],
      },
    ],
    code: `evaluate(value, now) {
  const bad = value == null ? true : value > threshold;
  if (!bad) return this.clear();             // pending blips vanish
  if (this.state === 'inactive') this.begin(now);
  if (now - this.since >= forMs) return this.fire();
}`,
    say: "Each rule is a state machine with a for-duration, so blips stay pending and never page. Missing data counts as bad, related alerts are grouped into one page, and a canary alert proves the pipeline works.",
    source: "/questions/metrics-monitoring#alerting",
  },
];
