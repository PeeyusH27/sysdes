import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A ladder goes from 3 to 6 and a snake from 6 to 1. A player lands on 3. Where does the player end up?",
    options: [
      "On 6, and the board should have refused this layout up front",
      "On 1, because jumps always chain",
      "On 3, because jumps cancel out",
    ],
    answer: 0,
    explain:
      "If jumps chain, 3 goes to 6 and then to 1, and a ladder landing on a snake that lands on a ladder can loop forever. The simple cure is to validate at construction that no jump lands on another jump's start. Then every move applies at most one jump.",
  },
  {
    q: "The team wants a 'bounce back' ending instead of 'land exactly'. What should change in the code?",
    options: [
      "A new EndRule class, and nothing else",
      "An if inside Game.play for the new rule",
      "A new subclass of Game",
    ],
    answer: 0,
    explain:
      "The end of the board is the only place the rules differ, and it is already behind an interface. A new class that maps position and roll to a square leaves Game, Board and the dice untouched. An if inside play means every future rule edits the turn logic.",
  },
  {
    q: "Why are the dice passed into the Game instead of created inside it?",
    options: [
      "So the game can be tested: a fixed sequence of rolls makes every move repeatable",
      "Because random numbers cannot be made inside a class",
      "To make the dice roll faster",
    ],
    answer: 0,
    explain:
      "A test needs to say 'the third roll is a 6'. With a Dice strategy the real game gets random dice, the test gets fixed dice, and the same game code runs in both. The same idea applies to the clock in other designs.",
  },
];
