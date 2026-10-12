import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Intervals are sorted by start and you are merging. The next interval starts after the open group's end. Why is it safe to treat that group as final?",
    options: [
      "Because the group already contains at least two intervals",
      "Because every later interval starts at or after this one, so it starts after the group's end too and can't touch it",
      "Because intervals in the input never overlap more than one other interval",
    ],
    answer: 1,
    explain: "Sorting by start means starts only grow as you sweep. Once one start is past the group's end, every later start is as well, so nothing can reach back and join the group.",
  },
  {
    q: "In a +1/-1 sweep line for meeting rooms, an end event and a start event happen at the same time t. Which should be processed first, and why?",
    options: [
      "The start, so the new meeting is counted as early as possible",
      "The end, because a room freed at t can be used by a meeting starting at t, so the two must not count as overlapping",
      "It doesn't matter: the maximum comes out the same either way",
    ],
    answer: 1,
    explain: "With half-open meetings, [1, 3) and [3, 5) never run together. Processing the start first would briefly count both and report one room too many. Sorting by (time, delta) puts -1 before +1.",
  },
  {
    q: "To keep the largest number of non-overlapping intervals, which interval should you keep first?",
    options: ["The one that starts first", "The shortest one", "The one that ends first"],
    answer: 2,
    explain: "The earliest-ending interval leaves the most room for the rest, and an exchange argument shows some optimal answer starts with it. Earliest start fails on [1, 100] versus several short intervals inside it; shortest fails when a short interval straddles two others.",
  },
];
