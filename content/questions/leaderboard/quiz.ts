import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Maya has 1,300 points; Leo and Ravi both have 1,200. With shared ranks (1224), how do you get Ravi's rank from Redis?",
    options: ["ZREVRANK lb ravi, plus 1", "1 + ZCOUNT lb (1200 +inf", "ZCARD lb minus ZRANK lb ravi"],
    answer: 1,
    explain:
      "ZCOUNT with an exclusive lower bound counts players with strictly more points: 1, so Ravi is #2, the same as Leo. ZREVRANK gives a unique position and breaks the tie by member name, so one of them would arbitrarily be #3.",
  },
  {
    q: "The board is split across 4 shards by player hash. How do you get the global top 100?",
    options: [
      "Ask each shard for its top 25 and concatenate",
      "Ask each shard for its top 100 and merge, keeping the best 100",
      "Ask only the shard that holds the current leader",
    ],
    answer: 1,
    explain:
      "All of the global top 100 could live on one shard, so every shard must return 100. Merging 400 sorted entries is cheap. Your own rank works the same way: 1 + the sum of ZCOUNT above your score on every shard.",
  },
  {
    q: "Why must a composite score like points × 2^28 + (MAX_TS − ts) keep points below 2^25?",
    options: [
      "Redis stores scores as 32-bit integers",
      "Redis scores are doubles: integers are exact only up to 2^53, and 25 + 28 = 53 bits",
      "ZINCRBY rejects scores above 2^25",
    ],
    answer: 1,
    explain:
      "Past 2^53 a double can't represent every integer, so neighbouring composites round to the same value and decode to the wrong points or time. 28 bits of seconds is about 8.5 years; 25 bits of points is 33,554,431.",
  },
];
