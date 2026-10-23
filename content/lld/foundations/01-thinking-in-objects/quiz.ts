import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A prompt says: a member borrows a book for 14 days, and late returns cost 0.50 a day. Which phrase most deserves its own class?",
    options: ["The number 14", "The borrowing itself: a Loan with a due date and a fee", "The 0.50 rate"],
    answer: 1,
    explain: "A relationship that carries its own data and behaviour (a due date, a fee) is a noun. The numbers are fields or constructor arguments, because they are what changes first.",
  },
  {
    q: "ElectricCar extends Car, and fillUp() calls refuel() on every vehicle, so it throws. What is the cleanest fix?",
    options: [
      "Catch the error inside fillUp",
      "Give Vehicle an energy source and let each source implement refill",
      "Make ElectricCar extend Vehicle directly and drop refuel",
    ],
    answer: 1,
    explain: "Delegating to a part means every vehicle answers the same call. Catching the error hides the broken contract, and removing refuel just makes fillUp crash with a different error.",
  },
  {
    q: "Two kinds of caller push straight into member.loans and one forgets the limit check. What is the root fix?",
    options: [
      "Copy the check into every caller",
      "Make the limit a global constant",
      "Hide the list inside Member and expose a borrow method that enforces the limit",
    ],
    answer: 2,
    explain: "Tell, don't ask: the object that holds the data enforces its own rule, so no caller can skip it.",
  },
];
