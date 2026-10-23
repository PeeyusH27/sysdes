import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "The ATM has one 50 and three 20s, and the customer asks for 60. What does a greedy dispenser do?",
    options: ["Pays 20 + 20 + 20", "Takes the 50, then cannot pay the last 10, so it fails", "Pays 50 + 10"],
    answer: 1,
    explain:
      "Greedy takes the biggest note that fits and never goes back, so it strands 10. Each handler in the chain tries the largest count it can, then fewer, and asks the next link whether the rest works. That finds three 20s.",
  },
  {
    q: "The account is debited, and then the cash unit jams. What should happen?",
    options: ["Nothing: the customer can call the bank", "Credit the same amount back and report that nothing was charged", "Retry forever while holding the account lock"],
    answer: 1,
    explain:
      "The debit and the cash are two steps that cannot be one transaction. Plan the notes first so most failures happen before any money moves, and undo the debit when the hardware fails. A production bank would hold the amount, then commit or release it.",
  },
  {
    q: "Where should the failed-PIN counter live?",
    options: ["In the ATM session", "On the account, shared by every machine", "On the card chip"],
    answer: 1,
    explain:
      "A counter in the session resets whenever the card is re-inserted, or when the attacker walks to another machine. Keeping it on the account, updated under the account's lock, makes three wrong tries the limit across the whole network.",
  },
];
