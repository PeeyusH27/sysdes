import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In a 45-minute design interview, about how long should the high-level design take?",
    options: ["5 minutes", "15 minutes", "30 minutes"],
    answer: 1,
    explain: "Roughly 5 for requirements, 5 for estimation and API, 15 for the high-level design, 15 for deep dives and 5 to wrap up. Thirty minutes of boxes leaves no time to go deep.",
  },
  {
    q: "The interviewer pushes back on your choice of database. What's the best first move?",
    options: [
      "Defend it firmly: changing your mind looks weak",
      "Restate their concern and weigh it against your requirements",
      "Switch to whatever they seem to prefer",
    ],
    answer: 1,
    explain: "Pushback is usually a hint. Restate the concern, check it against the requirements and numbers, then either defend with numbers or adapt explicitly.",
  },
  {
    q: "In the RADIO framework for frontend interviews, what does the O stand for?",
    options: ["Observability", "Optimizations", "Operations"],
    answer: 1,
    explain: "Requirements, Architecture, Data model, Interface, Optimizations: performance, network, accessibility, internationalisation and security come last.",
  },
];
