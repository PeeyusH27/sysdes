import type { FlowSpec, SequenceSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "leaderboard-architecture",
  title: "Real-time leaderboard architecture",
  description:
    "Match results are validated, appended to Kafka and applied to Redis sorted sets by a board updater, while a DB writer keeps the durable copy. Players read the top 100 from a one-second cache and their own rank from a Redis replica.",
  nodes: [
    { id: "match", label: "Match server", kind: "service", col: 0, row: 0, sub: "signs results", note: "Server-authoritative: it computes the points. The player's phone never submits its own score." },
    { id: "scoreapi", label: "Score API", kind: "service", col: 1, row: 0, sub: "×N" },
    { id: "anticheat", label: "Anti-cheat", kind: "service", col: 1, row: 1, sub: "rules + signature" },
    { id: "kafka", label: "score-events", kind: "queue", col: 2, row: 0, sub: "Kafka, by player", note: "The commit point: once Kafka acknowledges (acks=all), the score is durable. Also the replay log for rebuilds." },
    { id: "dbwriter", label: "DB writer", kind: "worker", col: 3, row: 0, sub: "batched" },
    { id: "db", label: "Scores DB", kind: "database", col: 4, row: 0, sub: "events, totals", note: "score_events (one row per match) and player_totals per period: the source a rebuild loads from." },
    { id: "updater", label: "Board updater", kind: "worker", col: 3, row: 1, sub: "Lua: ZINCRBY ×3" },
    { id: "client", label: "Player app", kind: "client", col: 0, row: 2 },
    { id: "api", label: "Leaderboard API", kind: "service", col: 1, row: 2, sub: "×N" },
    { id: "cache", label: "Top-100 cache", kind: "cache", col: 1, row: 3, sub: "1 s, in-process" },
    { id: "redis", label: "Redis primary", kind: "cache", col: 4, row: 2, sub: "ZSETs, ~17 GB", note: "lb:{g1}:all, one key per day and per week, and the last applied Kafka offset per partition." },
    { id: "replica", label: "Redis replica", kind: "cache", col: 4, row: 3, sub: "reads, failover" },
  ],
  edges: [
    { from: "match", to: "scoreapi", label: "signed result" },
    { from: "scoreapi", to: "anticheat", label: "validate" },
    { from: "scoreapi", to: "kafka", label: "append", style: "async" },
    { from: "kafka", to: "dbwriter", label: "consume", style: "async" },
    { from: "dbwriter", to: "db", label: "events + totals" },
    { from: "kafka", to: "updater", label: "consume", style: "async" },
    { from: "updater", to: "redis", label: "script" },
    { from: "updater", to: "replica", label: "after failover" },
    { from: "redis", to: "replica", style: "replication" },
    { from: "db", to: "redis", label: "rebuild", style: "async" },
    { from: "client", to: "api", label: "top, my rank" },
    { from: "api", to: "cache", label: "top 100" },
    { from: "api", to: "replica", label: "ZREVRANGE, ZCOUNT" },
  ],
  scenarios: [
    {
      id: "score-update",
      name: "Score update",
      steps: [
        { edge: "match>scoreapi", caption: "Maya's match ends. The match server, not her phone, posts the signed result: match m-881, +50 points, played at 20:14:07 UTC." },
        {
          edge: "scoreapi>anticheat",
          caption: "Anti-cheat checks the signature and whether the result is plausible: points per minute, match length, matches played this hour.",
          mark: [{ node: "anticheat", state: "busy" }],
        },
        { edge: "scoreapi>anticheat", reverse: true, tone: "ok", caption: "Valid.", mark: [{ node: "anticheat", state: "ok" }] },
        {
          edge: "scoreapi>kafka",
          caption: "The Score API appends the event to score-events, keyed by player id, with acks=all. Once Kafka acknowledges, the score is durable.",
          mark: [{ node: "kafka", state: "ok" }],
        },
        {
          edge: "match>scoreapi",
          reverse: true,
          tone: "ok",
          caption: "202 Accepted. Nothing on this path touches Redis, so a burst of match ends just queues up in Kafka.",
          mark: [{ node: "anticheat", state: null }, { node: "kafka", state: null }],
        },
        { edge: "kafka>updater", caption: "Two consumer groups read the event independently, typically within 100 ms.", with: [{ edge: "kafka>dbwriter", caption: "" }] },
        {
          edge: "updater>redis",
          caption: "One Lua script: skip the event if its partition offset was already applied; otherwise ZINCRBY the all-time, today's and this week's board by 50.",
        },
        {
          edge: "updater>redis",
          reverse: true,
          tone: "ok",
          caption: "Maya's all-time total is now 1,250. All three boards and the offset changed in one atomic step.",
          mark: [{ node: "redis", state: "ok" }],
        },
        {
          edge: "dbwriter>db",
          caption: "The DB writer inserts the event (a redelivery hits the match_id primary key and does nothing) and bumps player_totals in the same transaction, a few hundred events per batch.",
        },
        {
          edge: "redis>replica",
          caption: "The replica follows within milliseconds. Rank reads go there, so the primary only takes writes. Maya's new rank is visible about 100 ms after her match ended.",
          mark: [{ node: "redis", state: null }],
        },
      ],
    },
    {
      id: "top-from-cache",
      name: "Top 100 from cache",
      steps: [
        { edge: "client>api", caption: "Thousands of players a second open the leaderboard screen: GET /boards/all/top?n=100." },
        { edge: "api>cache", caption: "Each Leaderboard API instance keeps the top 100 in memory for one second." },
        {
          edge: "api>cache",
          reverse: true,
          tone: "ok",
          caption: "Hit. No Redis call at all: everyone sees the same list, at most a second old.",
          mark: [{ node: "cache", state: "hit" }],
        },
        { edge: "api>cache", tone: "miss", caption: "A second later the entry has expired, and the next request refreshes it.", mark: [{ node: "cache", state: "miss" }] },
        { edge: "api>replica", caption: "ZREVRANGE lb:{g1}:all 0 99 WITHSCORES: O(log n + 100), well under a millisecond even with 50M members." },
        {
          edge: "api>replica",
          reverse: true,
          tone: "ok",
          caption: "100 ids and scores come back. The API numbers them (equal scores share a rank), adds names from a profile cache, and stores the result for one second.",
        },
        {
          edge: "client>api",
          reverse: true,
          tone: "ok",
          caption: "The list renders. With N API instances, Redis sees about N top-100 reads per second, however many players are looking.",
          mark: [{ node: "cache", state: null }],
        },
      ],
    },
    {
      id: "my-rank",
      name: "My rank and around me",
      steps: [
        { edge: "client>api", caption: "Ravi taps My rank: GET /boards/all/players/ravi." },
        { edge: "api>replica", caption: "ZSCORE returns his 900 points in O(1). ZCOUNT key (900 +inf then counts the players with strictly more." },
        {
          edge: "api>replica",
          reverse: true,
          tone: "ok",
          caption: "18,402,117 players are ahead. The skip list keeps a span count on every link, so ZCOUNT is O(log n): a few dozen hops for 50M members, nothing scanned.",
        },
        { edge: "client>api", reverse: true, tone: "ok", caption: "Ravi is #18,402,118. Everyone else on 900 points shares that rank." },
        { edge: "client>api", caption: "He opens Around me." },
        { edge: "api>replica", caption: "ZREVRANK gives his 0-based position p; ZREVRANGE key p-5 p+5 WITHSCORES fetches his neighbours. Two O(log n) calls." },
        {
          edge: "client>api",
          reverse: true,
          tone: "ok",
          caption: "He sees the 5 players just above and below him. This deep in the table, 'top 37%' would serve him as well as an exact number.",
        },
      ],
    },
    {
      id: "redis-failover",
      name: "Redis primary fails",
      steps: [
        { edge: "updater>redis", caption: "The updater applies events as usual. Each script also stores the partition's last applied Kafka offset." },
        { edge: "redis>replica", caption: "Replication is asynchronous: the replica is a few milliseconds behind." },
        {
          edge: "updater>redis",
          tone: "error",
          caption: "The primary crashes. The last few milliseconds of scripts never reached the replica, though their Kafka offsets were already committed.",
          mark: [{ node: "redis", state: "down" }],
        },
        { edge: "api>replica", tone: "ok", caption: "Reads carry on from the replica: a few milliseconds stale, but up." },
        {
          edge: "updater>replica",
          caption: "Sentinel promotes the replica (a few seconds with a tuned down-after timeout), and the updater reconnects to the new primary.",
          mark: [{ node: "replica", state: "ok" }],
        },
        {
          edge: "updater>replica",
          reverse: true,
          caption: "It reads each partition's applied offset there. Those keys changed in the same scripts as the boards, so they say exactly which events the new primary has.",
        },
        {
          edge: "kafka>updater",
          caption: "It seeks each partition back to that offset and replays. The lost events are applied once; anything already applied fails the offset check and is skipped.",
        },
        {
          edge: "db>redis",
          caption: "Lose both copies? A rebuild job loads player_totals from the Scores DB into a fresh instance with batched ZADDs (50M members in minutes), then the updater replays Kafka from the offsets stored with those totals.",
          mark: [{ node: "redis", state: null }, { node: "replica", state: null }],
        },
      ],
    },
  ],
};

export const submitSequence: SequenceSpec = {
  id: "leaderboard-submit-sequence",
  title: "Submit a match result",
  description:
    "The Score API validates and appends to Kafka; the board updater applies the event to Redis. Switch branches to see a new personal best, a score that isn't one, a tie with a rival, a replayed event, and a rejected result.",
  actors: [
    { id: "match", label: "Match server", kind: "service" },
    { id: "api", label: "Score API", kind: "service" },
    { id: "cheat", label: "Anti-cheat", kind: "service" },
    { id: "kafka", label: "score-events", kind: "queue" },
    { id: "upd", label: "Board updater", kind: "worker" },
    { id: "redis", label: "Redis", kind: "cache" },
  ],
  items: [
    { from: "match", to: "api", label: "POST /matches/m-881/result" },
    { from: "api", to: "cheat", label: "validate signature, points" },
    {
      alt: [
        {
          when: "valid",
          items: [
            { from: "cheat", to: "api", label: "ok", type: "reply" },
            { from: "api", to: "kafka", label: "append (acks=all)" },
            { from: "api", to: "match", label: "202 Accepted", type: "reply" },
            { from: "kafka", to: "upd", label: "event, offset 7,420", type: "async" },
            { from: "upd", to: "redis", label: "Lua: offset check, ZINCRBY ×3" },
            {
              alt: [
                {
                  when: "new personal best",
                  items: [
                    { from: "redis", to: "upd", label: "all-time total 1,250", type: "reply" },
                    { from: "upd", to: "redis", label: "ZADD best GT CH enc(950, t)" },
                    { from: "redis", to: "upd", label: "1: best raised to 950", type: "reply" },
                    { from: "upd", to: "redis", label: "PUBLISH rank change", type: "async" },
                  ],
                },
                {
                  when: "not a best",
                  items: [
                    { from: "redis", to: "upd", label: "all-time total 1,250", type: "reply" },
                    { from: "upd", to: "redis", label: "ZADD best GT CH enc(700, t)" },
                    { from: "redis", to: "upd", label: "0: best stays 950", type: "reply" },
                    { note: "The points boards still grew; only the best-score board is untouched", over: ["upd", "redis"] },
                  ],
                },
                {
                  when: "ties a rival",
                  items: [
                    { from: "redis", to: "upd", label: "all-time total 1,250", type: "reply" },
                    { from: "upd", to: "redis", label: "ZADD best GT CH enc(950, t)" },
                    { from: "redis", to: "upd", label: "1: placed just below Leo", type: "reply" },
                    { note: "Leo reached 950 yesterday: same points, earlier time, larger composite, so he stays ahead", over: ["upd", "redis"] },
                  ],
                },
                {
                  when: "replayed event",
                  items: [
                    { note: "After a failover the updater rewinds to offset 7,400", over: ["kafka", "upd"] },
                    { from: "redis", to: "upd", label: "nil: 7,420 already applied", type: "reply" },
                    { note: "Nothing is counted twice; ZADD GT would be a no-op anyway", over: ["upd", "redis"] },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: "rejected",
          items: [
            { from: "cheat", to: "api", label: "9,999 points in 40 s: impossible", type: "reply" },
            { from: "api", to: "match", label: "422, flagged for review", type: "reply" },
            { note: "Nothing reaches Kafka or Redis", over: ["api", "cheat"] },
          ],
        },
      ],
    },
  ],
};
