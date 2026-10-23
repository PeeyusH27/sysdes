import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "The PSP call times out after 10 s. What should happen to the payment?",
    options: [
      "Mark it failed and let the customer try again",
      "Mark it unknown, then settle it from the webhook or a status query, retrying only with the same idempotency key",
      "Retry immediately with a fresh idempotency key",
    ],
    answer: 1,
    explain:
      "A timeout does not tell you if the card was charged. Calling it failed invites a second payment, and a fresh key lets the PSP charge twice. Keep it unknown and let the PSP's record decide.",
  },
  {
    q: "The PSP delivers webhook evt_9 twice, the second time after you already processed it. What keeps the ledger right?",
    options: [
      "Checking in application code whether the ledger already has entries for the payment",
      "A unique event id in webhook_events, plus forward-only state transitions, in the same transaction as the ledger posting",
      "Asking the PSP to stop retrying",
    ],
    answer: 1,
    explain:
      "ON CONFLICT DO NOTHING on the event id makes a repeat do nothing, even when two arrive at once. Forward-only moves make late events harmless. Checking in code races, and PSPs always retry.",
  },
  {
    q: "A customer pays $50.00. The PSP keeps a $1.75 fee and the platform a $5.00 commission. Which posting is right?",
    options: [
      "Debit cash at PSP $50.00; credit merchant payable $45.00",
      "Debit cash at PSP $48.25 and PSP fees $1.75; credit merchant payable $45.00 and platform revenue $5.00",
      "Credit merchant payable $45.00 and platform revenue $5.00, and update the merchant's balance column",
    ],
    answer: 1,
    explain:
      "Debits ($48.25 + $1.75) equal credits ($45.00 + $5.00), so it sums to zero. The first option is off by $5.00. The third has no debit side: money can't appear from nowhere.",
  },
];
