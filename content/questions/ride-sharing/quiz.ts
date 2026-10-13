import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "5M online drivers send a location every 4 s. Where should each update go?",
    options: ["A new row in Postgres per update", "Overwrite the driver's entry in an in-memory geo index (Redis GEO), and batch history to Kafka", "Nowhere: the rider's app asks each driver's phone directly"],
    answer: 1,
    explain: "That's 1.25M writes/s. Only the latest position matters for matching, so overwrite it in memory with a TTL; history goes to an append-only log in batches. A durable row per update would be about 11 TB a day of writes nobody reads.",
  },
  {
    q: "Why does a nearby search read the rider's cell and its 8 neighbours, not just the rider's cell?",
    options: ["To find more drivers when the cell is empty", "A driver 10 m away can sit across a cell edge, even under a completely different geohash prefix", "Redis requires at least 9 cells per query"],
    answer: 1,
    explain: "Cells have edges, and a rider near one is closer to the next cell than to most of their own. Two points 31 m apart on either side of the equator and the prime meridian hash to s00000 and 7zzzzz.",
  },
  {
    q: "Two matchers pick the same free driver in the same millisecond. What prevents a double assignment?",
    options: ["Each matcher reads the driver's state, then writes OFFERED if it was AVAILABLE", "A compare-and-set (AVAILABLE → OFFERED, atomically) that only one of them can win", "Offering each ride to drivers in a random order"],
    answer: 1,
    explain: "Read-then-write leaves a gap where both see AVAILABLE. A Lua script in Redis or UPDATE … WHERE state = 'AVAILABLE' makes the check and the write one step: the loser sees it fail and moves to its next candidate.",
  },
];
