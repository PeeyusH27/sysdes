import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "snake-and-ladder-classes",
  title: "Snake and Ladder class diagram",
  description:
    "Game owns a Board, the players and their positions, and takes its dice and ending rule as strategies. The Board holds one map of jumps, because a snake and a ladder differ only in direction. Each turn returns a MoveResult, and listeners observe the game.",
  classes: [
    { id: "dice", name: "Dice", col: 0, row: 0, stereotype: "interface", methods: ["roll(): 1..6"] },
    { id: "random", name: "RandomDice", col: 1, row: 0, fields: ["rng: injected", "sides: 6"], methods: ["roll()"] },
    { id: "fixed", name: "FixedDice", col: 2, row: 0, fields: ["rolls: [3, 4, 6]"], methods: ["roll(): next, then repeat"] },
    { id: "listener", name: "Listener", col: 3, row: 0, stereotype: "interface", methods: ["onMove(result)"] },

    { id: "player", name: "Player", col: 0, row: 1, fields: ["name: string", "position: int, 0 = off board"] },
    {
      id: "game",
      name: "Game",
      col: 1,
      row: 1,
      fields: ["board: Board", "players: Player[]", "turn: index", "winner: Player or null"],
      methods: ["play(): MoveResult", "on(listener)"],
    },
    { id: "rule", name: "EndRule", stereotype: "interface", col: 2, row: 1, methods: ["apply(pos, roll, size): square or none"] },
    { id: "exact", name: "ExactRule", col: 3, row: 1, fields: ["also: Finish, Bounce"], methods: ["overshoot: refused"] },

    { id: "board", name: "Board", col: 1, row: 2, fields: ["size: int", "jumps: Map<from, to>"], methods: ["land(square)", "kindAt(square)"] },
    { id: "jump", name: "Jump", col: 2, row: 2, fields: ["from, to", "to > from: ladder", "to < from: snake"] },
    { id: "result", name: "MoveResult", col: 3, row: 2, fields: ["player, roll", "from, to", "event: move | ladder | snake | stay | win"] },
  ],
  relations: [
    { from: "game", to: "board", type: "composition" },
    { from: "game", to: "player", type: "composition", label: "2..*" },
    { from: "board", to: "jump", type: "composition", label: "0..*" },
    { from: "game", to: "dice", type: "association", label: "rolls" },
    { from: "random", to: "dice", type: "implements" },
    { from: "fixed", to: "dice", type: "implements" },
    { from: "game", to: "rule", type: "association", label: "ends" },
    { from: "exact", to: "rule", type: "implements" },
    { from: "game", to: "result", type: "dependency", label: "returns" },
    { from: "listener", to: "game", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "A game, a board and players", note: "A game owns a board, the players, and whose turn it is. A snake and a ladder are one idea, a jump from a square to another, so the board has one map and no Snake and Ladder classes.", add: ["game", "board", "jump", "player"] },
    { title: "The dice are a strategy", note: "Where a roll comes from is a Dice. Random dice play the real game, and fixed dice make every test and demo repeatable.", add: ["dice", "random", "fixed"] },
    { title: "The ending is a strategy", note: "Overshooting the last square is the rule people argue about. An EndRule decides the new square, or refuses the move, so exact landing, finishing on any roll and bouncing back are one class each.", add: ["rule", "exact"] },
    { title: "Each turn reports what happened", note: "play() returns a MoveResult, and listeners are told too. A UI, a log and a test all watch the game without the game knowing them.", add: ["result", "listener"] },
  ],
};

export const turn: SequenceSpec = {
  id: "snake-and-ladder-turn",
  title: "One call to play()",
  description:
    "Game takes the next player, asks the dice for a roll, and asks the ending rule where the roll lands. The board then applies any jump on that square. Pick a branch to see a plain move, a ladder, a snake, a refused overshoot and a winning move.",
  actors: [
    { id: "caller", label: "Caller", kind: "client" },
    { id: "game", label: "Game", kind: "service" },
    { id: "dice", label: "Dice", kind: "worker" },
    { id: "rule", label: "EndRule", kind: "worker" },
    { id: "board", label: "Board", kind: "database" },
  ],
  items: [
    { from: "caller", to: "game", label: "play()" },
    { note: "player A at 8, board size 10", over: ["game", "board"] },
    { from: "game", to: "dice", label: "roll()" },
    { from: "dice", to: "game", label: "the roll", type: "reply" },
    { from: "game", to: "rule", label: "apply(8, roll, 10)" },
    {
      alt: [
        {
          when: "plain move",
          items: [
            { note: "roll 1: the rule says 9, an empty square", over: ["game", "rule"] },
            { from: "game", to: "board", label: "kindAt(9): no jump" },
            { from: "game", to: "caller", label: "A 8 to 9, move", type: "reply" },
          ],
        },
        {
          when: "ladder or snake",
          items: [
            { note: "roll 1: the rule says 9, and 9 is a snake head (to 2)", over: ["game", "rule"] },
            { from: "game", to: "board", label: "land(9)" },
            { from: "board", to: "game", label: "2 (a snake)", type: "reply" },
            { from: "game", to: "caller", label: "A 8 to 2, snake", type: "reply" },
          ],
        },
        {
          when: "overshoot, exact rule",
          items: [
            { from: "rule", to: "game", label: "roll 3: refused, 11 is past 10", type: "reply" },
            { from: "game", to: "caller", label: "A stays on 8, stay", type: "reply" },
          ],
        },
        {
          when: "win",
          items: [
            { note: "roll 2: the rule says 10, the last square", over: ["game", "rule"] },
            { from: "game", to: "caller", label: "A 8 to 10, win; later play() returns nothing", type: "reply" },
          ],
        },
      ],
    },
  ],
};
