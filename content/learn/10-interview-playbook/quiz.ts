import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In a 45-minute design interview, about how long should the high-level design take?",
    options: ["5 minutes", "15 minutes", "30 minutes"],
    answer: 1,
    explain: "About 5 for requirements, 5 for numbers and API, 15 for the design, 15 for deep dives and 5 to wrap up. Thirty minutes of boxes leaves no time for depth.",
  },
  {
    q: "The interviewer pushes back on your choice of database. What's the best first move?",
    options: [
      "Defend it firmly: changing your mind looks weak",
      "Restate their concern and weigh it against your requirements",
      "Switch to whatever they seem to prefer",
    ],
    answer: 1,
    explain: "Pushback is usually a hint. Restate the concern, check it against your requirements and numbers, then defend or adapt.",
  },
  {
    q: "In the RADIO framework for frontend interviews, what does the O stand for?",
    options: ["Observability", "Optimizations", "Operations"],
    answer: 1,
    explain: "Requirements, Architecture, Data model, Interface, Optimizations. Performance, accessibility and security come last.",
  },
  {
    q: "At minute 25 you are still drawing the design. What is the best move?",
    options: [
      "Speed through everything that remains",
      "Say so, finish fast, take one deep dive and name the second",
      "Skip the deep dives and wrap up early",
    ],
    answer: 1,
    explain: "Naming the gap and compressing keeps the part that scores most. One deep dive plus a one-line mention of the second shows you know it is there.",
  },
  {
    q: "Your estimate shows 40 writes a second. What do you say about sharding?",
    options: [
      "Shard now so we are ready for growth",
      "One database is enough; I would shard if writes reach about 40,000 a second",
      "Skip the topic so the answer stays short",
    ],
    answer: 1,
    explain: "Name the choice and the load that would change it. At 40 writes a second a single Postgres is far below its limit, and sharding would only add cost.",
  },
];
