import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Why model Book and BookItem as two classes?",
    options: [
      "A book is the title that readers search for and reserve, and an item is one physical copy that is loaned, held or lost",
      "To make the diagram bigger",
      "Because a library may own the same ISBN in two languages",
    ],
    answer: 0,
    explain:
      "Titles and copies have different data and different rules. Search, reservation queues and authors belong to the title. Condition, shelf and loan state belong to the copy. One class for both forces a count column and makes 'who has copy 2?' impossible to answer.",
  },
  {
    q: "A copy comes back while two members are waiting for the title. What should happen to the copy?",
    options: [
      "It becomes AVAILABLE, and the first member to ask gets it",
      "It becomes HELD for the first waiting member, who is notified, and others cannot borrow it",
      "It is shelved until the library opens tomorrow",
    ],
    answer: 1,
    explain:
      "If the copy became AVAILABLE, a walk-in could take it ahead of someone who has waited a week. Handing it straight to the queue keeps the queue honest, and a hold deadline stops an absent member from blocking the next person forever.",
  },
  {
    q: "Two members try to borrow the last copy at the same moment. What makes sure only one succeeds?",
    options: [
      "Check that the copy is AVAILABLE, then set it to LOANED, as two separate steps",
      "Do the check and the move to LOANED as one atomic step: a lock, or a conditional update in the database",
      "Show a warning on the screen",
    ],
    answer: 1,
    explain:
      "A check followed by a write has a gap that two requests slip through, and the copy is loaned twice. In SQL this is UPDATE ... SET state = 'LOANED' WHERE id = ? AND state = 'AVAILABLE', then reading how many rows changed.",
  },
];
