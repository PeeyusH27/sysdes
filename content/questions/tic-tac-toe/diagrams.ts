import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "tic-tac-toe-classes",
  title: "Tic-tac-toe class diagram",
  description:
    "Board owns the grid and the running total of each row, column and diagonal, so it can say in O(1) whether a mark finishes a line. Game owns the turn, the status and the undo stack of moves. A Bot is a swappable strategy that reads the board and picks a cell.",
  classes: [
    { id: "mark", name: "Mark", col: 0, row: 0, fields: ["X = +1", "O = -1"], methods: ["other(): Mark"] },
    { id: "status", name: "Status", col: 1, row: 0, fields: ["IN_PROGRESS", "WON", "DRAW"] },
    { id: "first", name: "FirstFree", col: 2, row: 0, methods: ["choose(board, mark)"] },
    { id: "sensible", name: "Sensible", col: 3, row: 0, methods: ["win, else block,", "else middle"] },

    {
      id: "board",
      name: "Board",
      col: 0,
      row: 1,
      fields: ["cells: n x n", "rows[n], cols[n]", "diag, anti", "filled"],
      methods: ["isFree(r, c)", "wouldComplete(mark, r, c)", "place(mark, r, c)", "clear(r, c)"],
    },
    {
      id: "game",
      name: "Game",
      col: 1,
      row: 1,
      fields: ["turn", "status, winner", "version", "history: Move[]"],
      methods: ["move(mark, r, c, seen?)", "undo()"],
    },
    { id: "bot", name: "Bot", col: 2, row: 1, stereotype: "interface", methods: ["choose(board, mark): cell"] },
    { id: "minimax", name: "Minimax", col: 3, row: 1, methods: ["choose(board, mark)", "searches every reply"] },

    { id: "played", name: "Move", col: 1, row: 2, fields: ["mark", "row, col"], methods: ["undo: board.clear(row, col)"] },
  ],
  relations: [
    { from: "game", to: "board", type: "composition" },
    { from: "game", to: "mark", type: "dependency", label: "whose turn" },
    { from: "game", to: "status", type: "association" },
    { from: "game", to: "played", type: "composition", label: "undo stack" },
    { from: "first", to: "bot", type: "implements" },
    { from: "sensible", to: "bot", type: "implements" },
    { from: "minimax", to: "bot", type: "implements" },
    { from: "bot", to: "board", type: "dependency", label: "reads" },
  ],
  stages: [
    { title: "A board that knows its lines", note: "Board owns the grid and one running total per row, column and diagonal. Adding +1 for X and -1 for O means a line is complete exactly when its total reaches n or minus n.", add: ["board", "mark"] },
    { title: "A game that owns the match", note: "Game owns whose turn it is, the status and a version. It decides whether a move is allowed and asks the board whether it wins. The board never knows about turns.", add: ["game", "status"] },
    { title: "A move you can take back", note: "Each applied move is pushed on a stack as a small command. Undo pops it and asks the board to clear that cell, which reverses the same four counters.", add: ["played"] },
    { title: "The opponent is a strategy", note: "A Bot is a function from board and mark to a cell. The game never learns which bot plays, so a human, a random player and a search can swap freely.", add: ["bot", "first"] },
    { title: "Smarter bots plug in", note: "A sensible bot and a full minimax search implement the same method. Neither touches Game or Board, which is the whole point of the interface.", add: ["sensible", "minimax"] },
  ],
};

export const moveFlow: SequenceSpec = {
  id: "tic-tac-toe-move",
  title: "One move, from the client to the board",
  description:
    "Game checks the version, the turn and the cell, asks the board whether the move would finish a line, places the mark, and then decides between win, draw and next turn. Pick a branch to see a normal move, a winning move, a draw and a rejected move.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "game", label: "Game", kind: "service" },
    { id: "board", label: "Board", kind: "cache" },
  ],
  items: [
    { from: "client", to: "game", label: "move(X, 1, 1)" },
    { note: "lock taken: one writer at a time", over: ["client", "game"] },
    {
      alt: [
        {
          when: "normal move",
          items: [
            { from: "game", to: "board", label: "isFree(1, 1)" },
            { from: "game", to: "board", label: "wouldComplete(X, 1, 1)" },
            { from: "board", to: "game", label: "false: totals 1, 1, 1, 1", type: "reply" },
            { from: "game", to: "board", label: "place(X, 1, 1)" },
            { note: "turn passes to O, version +1", over: ["game", "board"] },
            { from: "game", to: "client", label: "OK", type: "reply" },
          ],
        },
        {
          when: "winning move",
          items: [
            { from: "game", to: "board", label: "wouldComplete(X, 1, 1)" },
            { from: "board", to: "game", label: "true: diagonal total reaches 3", type: "reply" },
            { from: "game", to: "board", label: "place(X, 1, 1)" },
            { note: "status WON, winner X, no next turn", over: ["game", "board"] },
            { from: "game", to: "client", label: "WIN", type: "reply" },
          ],
        },
        {
          when: "last cell, no line",
          items: [
            { from: "game", to: "board", label: "wouldComplete(X, 2, 2)" },
            { from: "board", to: "game", label: "false", type: "reply" },
            { from: "game", to: "board", label: "place(X, 2, 2): filled is 9" },
            { note: "board full and no winner: status DRAW", over: ["game", "board"] },
            { from: "game", to: "client", label: "DRAW", type: "reply" },
          ],
        },
        {
          when: "rejected",
          items: [
            { note: "game over, stale version, wrong turn or taken cell", over: ["game", "board"] },
            { from: "game", to: "client", label: "GAME_OVER, STALE, NOT_YOUR_TURN or INVALID_MOVE", type: "reply" },
            { note: "nothing changed and the turn is not used up", over: ["client", "game"] },
          ],
        },
      ],
    },
  ],
};

export const raceFlow: SequenceSpec = {
  id: "tic-tac-toe-race",
  title: "Two clients act on the same board",
  description:
    "Both players' clients read version 0 and send a move at the same time. The lock lets one in first and bumps the version. The second move carries the old version, so it is refused as stale and the client refreshes instead of overwriting.",
  actors: [
    { id: "a", label: "Client A", kind: "client" },
    { id: "b", label: "Client B", kind: "client" },
    { id: "game", label: "Game", kind: "service" },
  ],
  items: [
    { note: "both clients show version 0", over: ["a", "b"] },
    { from: "a", to: "game", label: "move(X, 0, 0, seen 0)" },
    { from: "b", to: "game", label: "move(X, 0, 0, seen 0)" },
    { note: "the lock admits A first; version becomes 1", over: ["a", "game"] },
    { from: "game", to: "a", label: "OK", type: "reply" },
    { from: "game", to: "b", label: "STALE", type: "reply" },
    { from: "b", to: "game", label: "read the board, version 1" },
    { note: "B sees the new board and decides again", over: ["b", "game"] },
  ],
};
