import { lifeEncoding, rotateImage } from "../../dsa/patterns/24-matrix/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "A grid is rows and columns",
      body: "A matrix is a list of rows, and each cell is found by its row number and column number. Most grid problems come down to working out where one cell should go.",
      eg: "A seating chart",
      example: "A cinema seat is row 3, seat 5. If the whole room turns a quarter turn, every seat gets a new row and seat number, and a formula tells you which.",
    },
    {
      head: "Index arithmetic does the work",
      body: "Turning a grid, reading a spiral or walking a diagonal are all rules about row and column numbers. Write the rule for one cell, then loop it over the grid.",
      eg: "A chessboard diagonal",
      example: "On a chessboard, squares on the same diagonal share the same row plus column. Add the two numbers and you know which diagonal a square sits on.",
      doodle: "dp-table",
    },
    {
      head: "Working inside the grid",
      body: "Often you may not make a second grid. So you swap cells in place, or leave notes inside the grid itself, such as zeroes in the first row and column as flags.",
      eg: "Notes in a margin",
      example: "Instead of a separate to-do list, you tick boxes in the margin of the page you are already reading. No extra paper needed.",
    },
    {
      head: "Everything changes at once",
      body: "In a simulation like the Game of Life, every cell updates at the same moment. If you overwrite a cell early, its neighbours see the wrong value. Store old and new together.",
      eg: "A class photo swap",
      example: "Everyone is told to swap seats at the same time. If one person moves first, the next sees the wrong neighbour. Write down who moves where, then move together.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "A copy costs a whole grid",
      line: "A 1,000 by 1,000 grid has a million cells. Copying it for every small change adds up.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Grid size", value: "1,000 × 1,000" },
          { label: "Cells in a copy", value: "n × m" },
        ],
        result: { label: "Extra memory", value: "1,000,000" },
        verdict: { text: "Too much for in place", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Turn it with two simple moves",
      line: "Swap across the diagonal, then reverse each row. That is a clockwise turn in place.",
      scene: { kind: "trace", trace: rotateImage, preset: "3 by 3" },
      predict: { q: "After the transpose, what makes it a clockwise turn?", options: ["Reverse every row", "Reverse every column"], answer: 0, why: "Rows reversed after a transpose send each cell to its clockwise spot." },
    },
    {
      tag: "sum",
      head: "Same time, far less space",
      line: "Both versions take n squared steps. Only the extra memory differs.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Copy then fill", value: 100, shown: "n² extra", tone: "bad" },
          { label: "Swap in place", value: 3, shown: "1 temp", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Which trick fits",
      line: "Match the problem's clue to the grid trick.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Rotate or flip", tone: "good", why: "Transpose plus reverse" },
          { label: "Spiral or layers", tone: "good", why: "Four moving walls" },
          { label: "All change at once", tone: "good", why: "Encode old and new state" },
          { label: "Sorted grid", tone: "warn", why: "Binary search or staircase" },
        ],
      },
      predict: { q: "Every cell must see the OLD grid. What do you do?", options: ["Update as you scan", "Mark changes, apply later"], answer: 1, why: "Early updates would be seen by the next cells." },
    },
    {
      tag: "idea",
      head: "Old and new in one cell",
      line: "2 means alive now, dead next. 3 means dead now, alive next. Clean up at the end.",
      scene: { kind: "trace", trace: lifeEncoding, preset: "Blinker" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Thin grids and shared rows break the neat version first.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["fill() shares one row", "Transpose loops j from 0", "Spiral reads a row twice"] },
        right: { title: "The fix", points: ["Array.from per row", "Start j at i + 1", "Check top <= bottom"] },
      },
    },
  ],
};
