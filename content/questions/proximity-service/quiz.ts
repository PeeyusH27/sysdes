import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A user in San Francisco searches within 1 km using a geohash index. Which length is used, and why?",
    options: [
      "6 characters: its cells are the smallest that still hold results",
      "5 characters: its cells (about 4.9 km tall) are at least as big as the radius, so the circle touches at most 9 cells",
      "9 characters: the most precise cell gives the best answer",
    ],
    answer: 1,
    explain:
      "A precision-6 cell is only about 0.6 km tall, so a 1 km circle can touch many cells. Choosing the longest geohash whose cells are at least as large as the radius guarantees the circle overlaps at most a 3 x 3 block of cells. Candidates are then filtered by exact distance.",
  },
  {
    q: "Your country has dense cities and huge empty areas. Why does a quadtree handle it better than a fixed geohash length?",
    options: [
      "A quadtree is always faster than a database",
      "It splits a cell only where it holds more than about 100 businesses, so every leaf stays small whatever the density",
      "It does not need exact distance checks",
    ],
    answer: 1,
    explain:
      "A fixed cell size that suits the countryside holds thousands of businesses in a city centre, and one that suits the city is almost empty in the desert. A quadtree adapts: dense areas become many tiny leaves, empty areas stay as one big leaf.",
  },
  {
    q: "Peak search load is about 17K queries a second and the whole index is about 2 GB. How should you scale it?",
    options: [
      "Shard the index across many servers by region",
      "Keep a full in-memory copy on several stateless search servers and add copies as load grows",
      "Query the database directly with a bounding-box filter",
    ],
    answer: 1,
    explain:
      "When the index fits in memory, replicate it: each server answers any query alone, a restart only needs a snapshot and a short replay, and a failed copy is invisible. Sharding adds routing and merging work that this size does not need.",
  },
];
