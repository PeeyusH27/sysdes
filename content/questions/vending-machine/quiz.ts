import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "The tubes hold one 25¢ and three 10¢ coins, and no 5¢. The customer is owed 30¢. What does greedy change-making do?",
    options: ["Pays 25¢ + 5¢", "Takes the 25¢, then can't pay the last 5¢, so it fails", "Pays 10¢ + 10¢ + 10¢"],
    answer: 1,
    explain:
      "Greedy grabs the largest coin that fits and never backtracks, so it gets stuck on the missing 5¢. A bounded DP over the coins actually in the tubes finds 10¢ + 10¢ + 10¢. If the DP finds nothing either, refuse the sale and refund.",
  },
  {
    q: "A customer presses Select while the machine is Dispensing. What should happen?",
    options: ["Queue the selection and run it after this vend", "Reject it: money and stock stay exactly as they are", "Cancel the current vend and refund"],
    answer: 1,
    explain:
      "Dispensing only accepts the drop sensor's dropped and dropFailed events. Everything else is rejected by default, which is what gives every (state, event) pair exactly one outcome. Queuing a purchase the customer can't see is a surprise refund or charge later.",
  },
  {
    q: "Why keep inserted coins in escrow instead of adding them to the change tubes straight away?",
    options: [
      "Escrow makes the coin validator faster",
      "Cancel and a failed drop can return the exact coins, and the money only becomes the machine's once the drop sensor confirms the sale",
      "The tubes can't hold coins of different sizes",
    ],
    answer: 1,
    explain:
      "Until the sensor sees the item fall, the coins are still the customer's. Committing on dropped and refunding on dropFailed or cancel keeps the books exact: escrow + tubes + coins paid out always equals the opening float + coins inserted.",
  },
];
