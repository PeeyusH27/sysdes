import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "On an n by n board, how do you check for a win in O(1) after each move?",
    options: [
      "Scan the row, the column and both diagonals of the move",
      "Keep a running total per row, column and diagonal, and test whether the touched ones reach n or minus n",
      "Store every winning line and compare the board against all of them",
    ],
    answer: 1,
    explain:
      "Add +1 for X and -1 for O to the totals that the move touches: one row, one column, and at most two diagonals. A line is full of one mark exactly when its total is n or minus n, because a mixed line cancels toward zero. Scanning costs O(n) per move, which is fine for 3 by 3 but not for a 500 by 500 board.",
  },
  {
    q: "A player sends an invalid move (the cell is taken). What should happen to the turn?",
    options: [
      "It passes to the other player as a penalty",
      "It stays with the same player, and nothing else changes",
      "The game ends in a draw",
    ],
    answer: 1,
    explain:
      "A rejected move is not a move. Every check runs before any change, so the board, the turn and the history are untouched, and the player simply tries again. Checking after placing the mark is how a taken-cell bug turns into a lost turn.",
  },
  {
    q: "Two browser tabs for the same player both send a move at the same moment. How do you keep one game state?",
    options: [
      "Trust whichever request arrives second",
      "Apply moves under one lock and send a version number, so a move based on an old view is refused",
      "Let each client keep its own copy of the board",
    ],
    answer: 1,
    explain:
      "A single writer (a lock, or one thread per game) makes the turn check and the cell check one atomic step. A version number then lets the server reject a move that was decided on an out-of-date board, instead of silently applying it.",
  },
];
