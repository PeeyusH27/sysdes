import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "requirements-estimation": {
    what: "Before designing anything, you work out what the system must do and roughly how big it will be. Requirements are the features and quality targets. Estimation is quick, rounded arithmetic on users, requests and storage.",
    why: "Without numbers, adding a cache or a shard is a guess. A peak of 350 requests a second fits on one server. At 35,000 you need caches and replicas. The sum tells you which system you are building.",
    example: "Planning a wedding. You ask how many guests and what budget before booking a hall. A hall for 20 people is wrong for 500, and nice decorations cannot fix that.",
    when: "Always, in the first 10 minutes of an interview. Round hard, end every estimate with so we need, and move on. Do not spend long on arithmetic.",
  },
  "api-load-balancing": {
    what: "A load balancer is a front door that spreads requests over several identical servers and skips any that are down. Stateless servers keep no user data themselves, so any server can answer any request.",
    why: "One server is a ceiling and a single point of failure. Behind a balancer, a crash or a deploy costs nothing, and more traffic means adding a machine. At 5,000 requests a second you need it for capacity too.",
    example: "A supermarket with six checkouts and a person at the entrance pointing each shopper to a short, open line. If one till breaks, the person simply stops sending shoppers there.",
    when: "Once you have more than one server, or want deploys and crashes to go unnoticed. Even at 200 requests a second a second server pays off. Keep sessions in Redis, not on one server.",
  },
  "databases-scaling": {
    what: "How to keep a database fast as it grows, cheapest fix first: an index (a lookup table that speeds searches), a bigger machine, a cache, read replicas (copies that answer reads), and last, sharding (splitting data across databases).",
    why: "Orders and payments live in the database, and copies of data must agree, so it is the hardest part to scale. A page taking 2 seconds at 300 queries a second is often just a missing index.",
    example: "A library gets busy. First add a catalogue so books are found fast. Then add copies of popular books for readers. Only as a last resort split the collection into separate buildings.",
    when: "Follow the order: indexes, bigger machine, cache, replicas, sharding. Shard only when one primary cannot take the writes or holds several terabytes. Replicas help reads, never writes.",
  },
  caching: {
    what: "A cache is a small, fast store that keeps the answers you need often, so you skip the slow trip to the database. It lives in memory, about 50 times faster, but each cached value is a copy and can go stale.",
    why: "The hit ratio is the share of reads the cache answers. Going from 90% to 99% cuts database load ten times. A hit takes about 1 ms, a miss about 50 ms.",
    example: "A shop keeps its best sellers on the front shelf instead of fetching them from the warehouse every time. Grabbing one is quick, but the price tag on the shelf can get out of date.",
    when: "Cache data that is read far more than it changes. Skip it when the database already answers fast, around 100 reads a second, or for write-heavy and per-user data where hits stay under 50%.",
  },
  "async-messaging": {
    what: "A queue is a waiting line for jobs. The app drops a job on it and moves on, and a separate worker picks it up later. Slow or flaky work then happens in the background instead of while the user waits.",
    why: "Sending a welcome email inline makes signup as slow as the email provider, say 800 ms. Queued, the API answers in tens of milliseconds. If the provider is down for an hour, emails wait instead of signups failing.",
    example: "A restaurant takes your order at the counter and hands a ticket to the kitchen. You get your number at once, and the cooks work through the tickets at their own pace, even in a rush.",
    when: "For work that is slow, unreliable, spiky or needed by many listeners. Keep it direct when the user needs the answer now, like a card result. Expect jobs to run twice, so make them safe to repeat.",
  },
  "consistency-cap": {
    what: "Data is copied onto several machines. Consistency means every copy shows the latest value. CAP says that when the network between copies breaks, you must choose: refuse some requests, or answer with possibly stale data.",
    why: "Copies survive dead servers, but they lag and can drift apart. Without a deliberate choice, two data centers could both pay out the same last 100. Waiting on a far region also costs about 70 to 100 ms.",
    example: "Two bank branches lose their phone link. Both customers ask for the last 100. The safe choice is to tell them to wait. For a like counter, showing 1,204 instead of 1,207 harms nobody, so keep answering.",
    when: "Choose per feature, not per product. Strong consistency for balances and payments, seeing your own edits for profiles, eventual for likes and views. Avoid saying pick 2 of 3.",
  },
  "reliability-observability": {
    what: "Reliability means the system keeps working while parts of it fail. Observability means you can see inside it through metrics, logs and traces. Together they contain failures and help you spot them before users do.",
    why: "Chain 10 services at 99.9% each and only about 99% of requests succeed. At scale something is always broken, so you contain failures, show something useful anyway, and notice first.",
    example: "A ship has watertight rooms, so one leak does not sink it. A circuit breaker works like a fuse in your home: when a service is drowning, calls stop and a fallback answers instead.",
    when: "From the first version: a timeout on every call, retries with random delays, and alerts on what users feel, like errors and slow pages, not CPU. Skip multi-region until your uptime target demands it.",
  },
  "case-url-shortener": {
    what: "A classic practice exercise: design a service like bit.ly that turns a long web address into a short one and redirects visitors. It teaches estimating scale, making unique codes, caching reads and keeping analytics off the fast path.",
    why: "It pulls every earlier lesson into one small problem. The twist is in the numbers: about 40 writes but 4,000 redirects a second, so the read path is the whole game.",
    example: "You paste a 200 character link into a text message and get back a short code. A friend taps it, a quick lookup finds the real page, and they land there in milliseconds.",
    when: "Use it as your first full practice run. In the interview, do the sum first: a private tool with 1,000 redirects a day needs one database. Caches and a CDN matter at thousands a second.",
  },
  "case-notification-system": {
    what: "A practice exercise: design a service that sends push, email and SMS messages to millions of users. It teaches queues, priorities, retries, backup providers and how to avoid sending duplicates.",
    why: "Unlike the URL shortener, it is write-heavy and asynchronous. 50 million users getting 10 messages a day is about 5,800 a second, with campaign bursts above 50,000. One slow channel must not hurt the rest.",
    example: "A post office has an express lane for urgent letters and a bulk lane for flyers. A sack of one million flyers never makes a login code wait.",
    when: "Practise it for async design. The key idea is separate queues by channel and priority. A small app with 100K users, about 6 messages a second, needs one worker, not all this machinery.",
  },
  "interview-playbook": {
    what: "A repeatable routine for the 45-minute design interview: requirements, numbers, API and data model, design, two deep dives, then trade-offs. It teaches how to organise your thinking, not what to build.",
    why: "Interviewers score scope, numbers, a working design, depth and trade-offs. Fixed steps make sure you cover every row even when nervous, and give you somewhere to return to when stuck.",
    example: "A pilot's pre-flight checklist. Pilots know how to fly, yet they run the same list every time so nothing is skipped under stress. The steps do the same job for your answer.",
    when: "On every design question, practised aloud with a timer. Phrase each choice as X because Y, at the cost of Z. When stuck, go back to requirements and numbers.",
  },
};
