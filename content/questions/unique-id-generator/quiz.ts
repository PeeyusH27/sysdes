import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In a Snowflake-style id (41 bits time, 10 bits worker, 12 bits sequence), how many ids can one worker make per millisecond, and per second?",
    options: ["1,024 per ms; about 1 million per second", "4,096 per ms; about 4.1 million per second", "2^41 per ms; effectively unlimited"],
    answer: 1,
    explain:
      "12 sequence bits give 2^12 = 4,096 values per millisecond, so 4,096,000 per second per worker. 10 worker bits allow 1,024 workers, about 4.19 billion ids a second in total. If the sequence runs out, the generator waits for the next millisecond.",
  },
  {
    q: "The server's clock steps back 60 ms after NTP corrects it. What should the generator do?",
    options: [
      "Keep issuing ids with the new, earlier timestamp",
      "Refuse to issue ids (and alert), because an earlier timestamp could repeat an id already issued",
      "Reset the sequence to 0 and carry on",
    ],
    answer: 1,
    explain:
      "A smaller timestamp with the same worker and sequence can produce an id that was already used. Tiny steps can be waited out, but a large one means refusing and failing over to another instance. A duplicate primary key is worse than a short error.",
  },
  {
    q: "Why do time-ordered ids (Snowflake, UUID v7) make database inserts faster than random UUID v4 primary keys?",
    options: [
      "They are shorter than UUIDs, so rows are smaller",
      "New keys sort after old ones, so inserts append to the end of the B-tree index instead of hitting random pages",
      "The database can skip uniqueness checks on them",
    ],
    answer: 1,
    explain:
      "A B-tree primary key with random values touches a random leaf page for every insert, causing page splits and cache misses. Time-ordered keys keep writes on the right-hand edge of the index, which stays in memory. Size matters too, but locality is the main win.",
  },
];
