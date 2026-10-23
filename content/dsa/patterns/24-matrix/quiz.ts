import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "To rotate a square grid 90 degrees clockwise in place, which two moves do the job?",
    options: [
      "Reverse every row, then reverse every column",
      "Transpose (swap m[i][j] with m[j][i]), then reverse every row",
      "Transpose twice",
    ],
    answer: 1,
    explain: "A cell at (i, j) goes to (j, i) after the transpose, and to (j, n - 1 - i) after the row reversal, which is where a clockwise quarter turn sends it. Transposing twice returns to the start.",
  },
  {
    q: "Set Matrix Zeroes: why is it wrong to zero a row the moment you see a 0?",
    options: [
      "Zeroing a row is O(n), which is too slow",
      "The new zeroes look like original zeroes, so the scan clears rows and columns it should not",
      "Rows can only be zeroed after columns",
    ],
    answer: 1,
    explain: "Decide first, change later. Record which rows and columns hold an original zero (the first row and column can serve as the flags), then apply the marks.",
  },
  {
    q: "In the in-place Game of Life, a cell that is alive now and dies next generation is stored as 2. What does this achieve?",
    options: [
      "Neighbour counts can still tell the cell was alive, so every cell is judged by the old generation",
      "It makes the board smaller",
      "It lets the algorithm skip the second pass",
    ],
    answer: 0,
    explain: "All cells change at the same moment, so decisions must use the old state. Encoding old and new together (2 and 3) keeps the old state readable until a final pass keeps only the new one.",
  },
];
