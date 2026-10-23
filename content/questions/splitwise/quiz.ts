import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A bill of 1000 cents is split equally among 3 people. What should the shares be?",
    options: ["333.33 each, as decimals", "334, 333, 333, with the extra cent to the first person in the given order", "333 each, and drop the cent"],
    answer: 1,
    explain:
      "Decimals drift and lose cents, and dropping the cent makes the books not add up. Floor each share, then hand the leftover cents out one each in a fixed order, so the shares always sum to the bill and the same input always gives the same answer.",
  },
  {
    q: "Why does simplify promise at most n - 1 transfers rather than the minimum number?",
    options: [
      "Finding the true minimum is NP-hard in general, while matching the biggest debtor to the biggest creditor is quick and settles one person each time",
      "The greedy answer is always the minimum",
      "The minimum is easy but slow to write",
    ],
    answer: 0,
    explain:
      "Each greedy transfer clears at least one person, so n people need at most n - 1 transfers. The true minimum is a subset-sum style problem. The greedy plan is rarely worse by much, and it is deterministic if ties break by name.",
  },
  {
    q: "Two members tap 'settle 100' at once on a debt of 100. Which design is safe?",
    options: ["Read the debt, then subtract it in a second step", "Check and subtract under the group's lock, in one step", "Retry on failure until the balance looks right"],
    answer: 1,
    explain:
      "A read followed by a write lets both calls see 100. Doing the check and the subtract inside one lock lets the second call see 0 and fail cleanly. One lock per group is enough, since groups do not share debts.",
  },
];
