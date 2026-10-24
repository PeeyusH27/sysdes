import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  typeahead: {
    what: "Typeahead is a search box that suggests completions while you type. Interviewers test whether you avoid flooding the server, never show answers for an older query, and keep the dropdown usable with a keyboard and a screen reader.",
    why: "Naive code sends a request on every key. A slow reply for rea can land after the reply for react and show the wrong list. A short prefix like a also matches millions of rows.",
    example: "A librarian helping you search. She waits until you stop mumbling (the debounce), drops your half-asked question once you ask a new one (cancel), and remembers answers she gave a minute ago (the cache).",
    when: "It is asked as a frontend question. Reach for a debounce of about 250 ms, cancelling stale requests, a small cache and the ARIA combobox pattern. On the server side, mention a trie behind a CDN.",
  },
  "infinite-feed": {
    what: "An infinite feed loads more posts as you scroll near the bottom. Interviewers test whether you page with a cursor (a bookmark meaning posts older than this one) and keep the page fast with thousands of items.",
    why: "Page numbers break when new posts arrive, because page 2 repeats posts you already saw. Rendering thousands of rows also slows the browser, so only about 20 stay on screen. Back must return to the same post.",
    example: "A reader with a bookmark in a huge book. The bookmark is the cursor and holds your place even if pages are added at the front. You hold only the few pages you are reading, not the whole book.",
    when: "It is asked as a frontend question. Reach for a sentinel watched by an IntersectionObserver, cursor paging and a virtualized list. Offsets only suit small, static lists where people jump to page 37.",
  },
  chat: {
    what: "A chat app delivers messages to people instantly, even when they sit on different servers. Interviewers test how you keep one open connection per phone (a WebSocket), never lose an acknowledged message, and keep messages in order.",
    why: "Ordinary web requests cannot push to a phone. With 10M people connected at once you need about 200 gateway servers. Offline users must catch up later, and a message must never vanish after the sender sees it sent.",
    example: "A post office. Each customer keeps a line open to a clerk, the gateway. The clerk writes your letter in a ledger, tells you got it, then passes it to the recipient's clerk. Someone away reads the ledger later.",
    when: "It is asked as a full-stack or backend question. Reach for WebSockets and a gateway first, then pub/sub between gateways. Store, then ack, then deliver. A sequence number per conversation gives order and catch-up.",
  },
  "news-feed": {
    what: "A news feed shows each user the posts of the people they follow. Interviewers test fan-out (copying one post to many places) and whether you copy at write time or assemble the feed at read time.",
    why: "Reads outnumber posts 60 to 1, so prebuilding feeds pays off. But 580 posts a second with 200 followers each become 116K writes a second. A celebrity with millions of followers makes copying too costly.",
    example: "A newspaper round. For most writers the paperboy drops a copy in every subscriber's mailbox the moment it prints. For a famous columnist with millions of readers, he skips that and readers collect the paper at the kiosk.",
    when: "It is asked as a full-stack question. Reach for hybrid fan-out: push for normal users, pull for celebrities over about 100K followers. Keep each feed as a list of post ids in Redis and page with a cursor.",
  },
  "ride-sharing": {
    what: "A ride-hailing service shows nearby cars and gives each ride request to exactly one driver. Interviewers test how you absorb constant location updates and search a map quickly using cells (a geospatial index).",
    why: "5M online drivers each report every 4 seconds, which is 1.25M updates a second. One database row per update would be about 10.8 TB a day. Only the latest position matters, so overwrite it in memory.",
    example: "A taxi dispatcher with a wall map cut into squares. Drivers call in and she moves their pin, forgetting the old spot. A rider's request goes to cars in their square and the eight around it, one phone call at a time.",
    when: "It is asked as a backend or full-stack question. Reach for an in-memory geo index (geohash cells or Redis GEO), a search of nine cells, and an offer to one driver at a time so nobody gets two rides.",
  },
  "web-crawler": {
    what: "A web crawler downloads pages by following links, so a search engine can index them. Interviewers test how you stay polite to every website, never fetch the same page twice, and keep a huge job running when sites fail.",
    why: "1 billion pages a month is about 386 fetches a second. A 10 second gap per host means thousands of hosts at once. Remembering 5B URLs exactly takes 40 GB, while a Bloom filter (a compact set test) needs about 6 GB.",
    example: "A copyist visiting thousands of libraries. Each library gets one visitor at a time with a pause between requests, so every site has its own queue. A checklist of shelves already copied stops repeats and endless loops.",
    when: "It is asked as a backend question. Reach for a URL frontier with a queue per host, a Bloom filter for seen URLs, robots.txt rules, and a message queue between the fetch and parse stages.",
  },
  "video-streaming": {
    what: "A video platform lets people upload videos and watch them smoothly on any device. Interviewers test the pipeline: resumable upload, transcoding (re-encoding into several qualities), and how the player and a CDN deliver the bytes.",
    why: "Peak is 5M streams at 2.5 Mbps, about 12.5 Tbps, far beyond your own servers. A 10 minute video becomes 750 encoding tasks. Big uploads often fail, and viewers outnumber uploads about 1,000 to 1.",
    example: "A publisher printing a book as short chapters in large, normal and pocket print. Branch libraries stock copies so readers never wait for the printer. Each reader switches size chapter by chapter as their eyes tire.",
    when: "It is asked as a full-stack question. Reach for chunked uploads to object storage, a queue of parallel transcode tasks, short segments served by a CDN, and a player that chooses the quality, not the server.",
  },
  "file-storage": {
    what: "File sync keeps a folder identical on all of a user's devices, like Dropbox. Interviewers test how you handle huge files, small edits, and two devices changing the same file at once without losing work.",
    why: "With 200 PB stored, re-uploading a 1 GiB file after a tiny edit wastes bandwidth. Cutting files into 4 MiB chunks means one edit uploads 0.4% of the file. A silent overwrite would destroy someone's work.",
    example: "A shared recipe binder of numbered pages. Change one page and you swap only that page. An index card lists the pages of each recipe. If two cooks edit one page, both versions are kept and marked.",
    when: "It is asked as a full-stack question. Reach for content-hashed chunks in object storage, a separate metadata service, a change cursor for syncing, and conflicted copies instead of silent overwrites.",
  },
  "key-value-store": {
    what: "A distributed key-value store keeps simple key and value pairs on many machines and stays up when some fail. Interviewers test partitioning, replication and the trade-off between fresh reads and availability.",
    why: "100 TB and 1M operations a second do not fit one machine. Plain hash mod N moves over 90% of keys when a node joins, but a consistent-hash ring moves about 1 in 51. With no leader, nothing is a single point of failure.",
    example: "Filing clerks around a circular street. Your document goes to the next clerk clockwise and two more as backups. To read, ask two clerks and trust the newest stamp. If a clerk is out, a neighbour holds the note.",
    when: "It is asked as a backend question, often modelled on Dynamo. Reach for a consistent-hash ring with virtual nodes and N replicas where R plus W exceeds N. Then add vector clocks, hinted handoff and Merkle-tree repair.",
  },
  "unique-id-generator": {
    what: "An ID generator makes a unique number for every new row or object, from many servers at once. Interviewers test how you avoid duplicates without one central counter that is slow and a single point of failure.",
    why: "A shared counter is a bottleneck. Random UUIDs take 16 bytes and have no order, so indexes grow. A Snowflake id fits 64 bits and sorts by time. Its risks are a clock going backwards and two servers sharing a worker id.",
    example: "A raffle ticket printed with the millisecond, the till that printed it, and a number within that millisecond. Two tills never clash and tickets sort by time, with no call to head office.",
    when: "It is asked as a backend question. Reach for the Snowflake layout: 41 bits of time, 10 of worker, 12 of sequence. Lease worker ids from a registry like etcd, and alert if the clock steps back far.",
  },
  "collaborative-editor": {
    what: "A collaborative editor lets many people type in one document at once and all end up with the same text. Interviewers test how you merge edits made at the same moment without losing anyone's work.",
    why: "Two people insert at the same spot at the same time, and naive code leaves their copies different forever. Your own typing must still feel instant. Total load is about 2M ops a second, but tiny per document.",
    example: "Two cooks rewriting one recipe by phone. A referee numbers every change in order and rewrites a late one to fit. Add salt after word 5 becomes after word 6 if someone added a word earlier.",
    when: "It is asked as a full-stack question. Reach for local echo, one session server per document that orders edits, and an operation log with snapshots. Name OT for a central server and CRDTs for offline work.",
  },
  "proximity-service": {
    what: "A proximity service finds places near a point, like restaurants within 2 km. Interviewers test how you search by location without comparing your position with all 200 million businesses.",
    why: "Checking every business on each search is far too slow. A geo index groups places by cell, so a search reads a few cells and sorts by exact distance. The index is only a few GB, and reads reach about 17K a second.",
    example: "A city map cut into labelled squares. To find coffee near you, look only at your square and the neighbours your circle touches, then measure the few shops inside. Busy downtown squares are split smaller.",
    when: "It is asked as a backend question about places that do not move. Reach for a geohash column or an in-memory quadtree, and replicate it. For moving things like cars, see the ride-sharing design.",
  },
  "distributed-cache": {
    what: "A distributed cache keeps hot data in memory across many machines, so most reads never reach the database. Interviewers test how you place keys, evict old ones, and survive the failures a cache creates.",
    why: "The database takes 20K reads a second but traffic is 1M, so you need a 98% hit ratio. Losing one of 12 nodes sends about 80K extra reads a second its way. Hash mod N would empty the cache.",
    example: "A restaurant pass where popular dishes wait under heat lamps and the kitchen is the database. Dishes are spread over twelve stations by name. If one runs out and fifty waiters ask, one cook remakes it and the rest wait.",
    when: "It is asked as a backend question. Reach for cache-aside with rendezvous or consistent hashing, LRU eviction and a TTL with jitter. Then cover stampedes, hot keys and stale fills.",
  },
  "metrics-monitoring": {
    what: "A monitoring system collects numbers such as CPU and latency from every server, stores them as time series, draws dashboards and pages the on-call engineer. Interviewers test heavy writes and alerts that fire only on real problems.",
    why: "100K hosts sending 100 metrics every 10 seconds make 1M samples a second, or 1.38 TB a day raw. Compression to about 1.4 bytes a sample cuts that to about 118 GB. Unbounded labels like user id explode the series count.",
    example: "A hospital ward. Each bed sensor sends a reading every ten seconds to the nurses' station, which keeps recent readings detailed and older ones as hourly summaries. The alarm sounds only if a reading stays bad for minutes.",
    when: "It is asked as a backend question. Reach for batching agents, Kafka, a compressed time-series database, rollups for old data, and alert rules with a for-duration. Warn about high-cardinality labels.",
  },
};
