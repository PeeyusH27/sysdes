import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Car A is at floor 2, sweeping up to a stop at 5. Car B is idle at 6. Who should answer 4▼?",
    options: ["Car A: it is only 2 floors away", "Car B: car A must reach 5 and come back, and stop at 5 on the way", "Whichever car was assigned a call least recently"],
    answer: 1,
    explain:
      "A direction-aware cost follows each car's sweep. Car A travels up 3 floors to 5, stops, then comes down 1: 4 floors plus a stop (about 2 floors' worth), so 6. Car B is 2 floors away. Plain distance would pick the wrong car.",
  },
  {
    q: "Why can't a floor starve under LOOK, when 'always go to the nearest stop' can starve one?",
    options: [
      "LOOK serves stops in the order they were pressed",
      "LOOK keeps its direction until nothing lies ahead, so any stop is reached within two sweeps of the building",
      "LOOK visits the top and bottom floors on every trip",
    ],
    answer: 1,
    explain:
      "A car never turns around while a stop lies ahead, so a waiting floor is passed at most once in the wrong direction: at most 2 × (floors − 1) floors of travel. Nearest-stop-first keeps chasing new nearby calls and can leave a far floor waiting forever. LOOK reverses at the last request, not at the ends (that is SCAN).",
  },
  {
    q: "Two people press ▲ on floor 5 a moment apart, on different panels. What makes sure only one car comes?",
    options: [
      "Each panel asks the nearest car directly",
      "One controller loop handles presses one at a time; the second press finds key 5▲ already owned and changes nothing",
      "A row lock on each car in a database",
    ],
    answer: 1,
    explain:
      "Presses are messages to a single controller (one event loop or actor per building). Each runs to completion, so the first press assigns 5▲ and the second sees the key in assigned and returns the same car. Panels choosing cars themselves would race.",
  },
];
