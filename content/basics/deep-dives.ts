import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "caching-techniques": {
    what: "Six ways to keep a cache (a fast copy of data) in step with the database. Each pattern decides who updates the copy and when. Examples are cache-aside, write-through and write-behind.",
    why: "A cache is a copy, and copies drift. The pattern sets how stale readers can be and what you lose if the cache dies. At 10,000 reads a second, a 99% hit ratio sends the database 100, against 5,000 at 50%.",
    example: "A notepad on your desk holds the answers you ask for most. Glance at it first. If the answer is missing, walk to the archive room and write it down. When the archive changes, cross out the note.",
    when: "Start with cache-aside: losing the cache only costs speed. Use write-through if users must see their own writes. Use write-behind only for data you can afford to lose, like view counts, never orders.",
  },
  "sharding-strategies": {
    what: "Sharding splits one big database into several smaller ones, called shards, each holding a slice of the data. A shard key decides which slice a row goes to, and a router sends each request to the right shard.",
    why: "Eventually one primary cannot take the writes or hold the data, for example 5 TB and 50,000 writes a second. Splitting spreads the load, but joins and transactions get harder forever.",
    example: "One checkout till has a long queue, so the shop opens more tills and sends shoppers by surname. A good rule spreads people evenly. A bad one sends everyone to till A.",
    when: "A last resort. First try a bigger machine, indexes, caching and replicas. 200 GB with 2,000 writes a second does not need it. If you shard, pick a key such as user_id that spreads evenly.",
  },
  "choosing-a-data-store": {
    what: "Picking which kind of database fits each kind of data. Relational, document, key-value, wide-column, search, columnar and object stores each suit a different way of reading and writing. Start from the access pattern, not the product.",
    why: "No one tool does every job. A normal database moves money correctly but is poor at holding a 2 GB video. A report scanning 100 million rows on the same machine can make checkout time out.",
    example: "A kitchen has a knife, a pot and a fridge because no single tool does every job. A shop likewise keeps orders in a relational database, videos in object storage and search in a search index.",
    when: "Default to Postgres for anything transactional: 10 million users at 1 KB each is only 10 GB. Add another store only when an access pattern needs a different shape, since each one is more to run.",
  },
  "polling-sse-websockets": {
    what: "Three ways to get live updates in a browser, where HTTP normally waits to be asked. Polling asks again and again. SSE (server-sent events) keeps one connection open for the server to push on. A WebSocket is a two-way channel.",
    why: "Live scores and chat need the server to speak first. 100,000 clients polling every 5 seconds make 20,000 requests a second, mostly empty. Each technique trades simplicity against delay and server cost.",
    example: "Checking your mailbox every five minutes is polling. A doorbell is SSE: the visitor rings and you listen. A phone call is a WebSocket, where both sides talk.",
    when: "Start with plain polling: 1,000 dashboards every 30 seconds is only 33 requests a second. Use SSE for one-way live data, WebSockets when the client sends often, like chat. Reconnect after a random delay.",
  },
  "connections-pooling": {
    what: "A connection pool keeps a few connections to a database or service open and lends them out, instead of opening a new one for every request. Opening a connection is slow and uses server memory.",
    why: "At a 50 ms round trip, setting up a connection burns about 150 ms before your first question. Servers also cap them: PostgreSQL allows 100 by default. Reuse removes both costs.",
    example: "Phoning a shop means waiting on hold before you can ask anything. A pool is like keeping a few lines already open and passing the phone to whoever has a question next.",
    when: "For every database and HTTP client. Keep instances times pool size under the database limit. Do not enlarge the pool to cure timeouts: it usually slows things down. Add PgBouncer when the total far exceeds the limit.",
  },
  "request-flows": {
    what: "The standard journeys a request takes through a system: read, write, async, failure and idempotent retry. Knowing them lets you answer walk me through what happens when a user clicks Buy.",
    why: "Interviewers ask that follow-up constantly, to check every box on your diagram has a job. With a 200 ms budget for the whole request, each hop also needs its own slice of time.",
    example: "Ordering a package online. Checking the item is a read, paying is a write, the confirmation email is async. If you tap Pay twice on weak signal, a retry key stops a second charge.",
    when: "Whenever you explain a design end to end. Match the flow to the action: caches for reads, one transaction for writes, a queue for slow work, timeouts and a fallback for failures.",
  },
};
