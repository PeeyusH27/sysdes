import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "At minute 30 your parking lot works end to end. The interviewer asks: 'What if two gates call park() at the same moment?' What is the strongest answer?",
    options: [
      "Node is single threaded, so it cannot happen",
      "Point at the check-then-act in the spot search, make check and claim one atomic step, and say what you would use across several processes",
      "Wrap every method in one global lock",
    ],
    answer: 1,
    explain: "Name the exact race (check that a spot is free, then take it), fix it by making the check and the claim one step (a lock, or claim first), and say that several servers need the database to arbitrate, for example a unique constraint. Locking everything is a blunt tool, and 'single threaded' is wrong as soon as an await sits between the check and the act.",
  },
  {
    q: "The prompt says: 'Discounts can be combined: 10% off, then free shipping above 50, then a coupon code.' Which pattern does the requirement call for?",
    options: [
      "Strategy, because the price rule varies",
      "State, because the order moves through phases",
      "Decorator, because each rule adjusts the result of the one inside it",
    ],
    answer: 2,
    explain: "Rules that stack and each adjust the previous result are wrappers with the same interface: Decorator. Strategy fits when you pick one rule from several. The order of wrapping is part of the answer, so say it aloud and test it.",
  },
  {
    q: "A hold on a meeting room must expire after 10 minutes. How do you test the boundary at exactly 10 minutes?",
    options: [
      "Sleep for 10 minutes in the test",
      "Patch the global clock for the whole test suite",
      "Inject a clock that the test advances to 9:59.999 and then to 10:00",
    ],
    answer: 2,
    explain: "A clock passed in as a parameter makes time an input. The test moves it to the boundary instantly and deterministically. Sleeping is slow and flaky, and a global patch leaks into other tests.",
  },
];
