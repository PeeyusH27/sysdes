import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/snake-and-ladder/diagrams";

// One roll. "chain" is a layout where jumps feed each other, "setup" is the same layout refused at construction.
const board: FlowSpec = {
  id: "story-snake-and-ladder",
  title: "A layout where jumps chain",
  description: "The game rolls, the board applies a jump, and a bad layout can keep jumping.",
  nodes: [
    { id: "player", label: "Player", kind: "client", col: 0, row: 1 },
    { id: "game", label: "Game", kind: "service", col: 1, row: 1 },
    { id: "dice", label: "Dice", kind: "worker", col: 2, row: 0 },
    { id: "board", label: "Board", kind: "database", col: 2, row: 2 },
  ],
  edges: [
    { from: "player", to: "game" },
    { from: "game", to: "dice" },
    { from: "game", to: "board" },
  ],
  scenarios: [
    {
      id: "chain",
      name: "Jumps chain",
      steps: [
        { edge: "player>game", caption: "A player rolls and lands on 3." },
        { edge: "game>board", caption: "A ladder goes from 3 up to 6." },
        { edge: "game>board", tone: "error", caption: "Square 6 is a snake head. Down to 3 again.", mark: [{ node: "game", state: "busy" }] },
        { edge: "game>board", tone: "error", caption: "3 is a ladder again. The turn never ends.", mark: [{ node: "game", state: "down" }] },
      ],
    },
    {
      id: "setup",
      name: "Refused up front",
      steps: [
        { edge: "game>board", caption: "At setup the board checks every jump.", mark: [{ node: "game", state: null }] },
        { edge: "game>board", tone: "miss", caption: "The ladder 3 to 6 lands on another jump's start." },
        { edge: "game>board", reverse: true, tone: "error", caption: "The layout is refused before any turn is played." },
        { edge: "game>dice", tone: "ok", caption: "Valid boards play with any dice, random or fixed." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Jumps that feed each other",
      line: "A ladder lands on a snake, which lands back on the ladder.",
      scene: { kind: "flow", spec: board, scenario: "chain" },
      predict: { q: "Ladder 3 to 6, snake 6 to 3. Does a turn end?", options: ["Yes, after one jump", "No, it loops"], answer: 1, why: "Every landing starts another jump, so there is no resting square." },
    },
    {
      tag: "fix",
      head: "Refuse the layout at setup",
      line: "No jump may land on another jump's start.",
      scene: { kind: "flow", spec: board, scenario: "setup" },
    },
    {
      tag: "sum",
      head: "Count the rule choices",
      line: "Rules multiply. If-branches in play() would multiply too.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Ending rules", value: "3" },
          { label: "Six repeats or not", value: "2" },
        ],
        result: { label: "Rule combinations", value: "6" },
        verdict: { text: "Make each a strategy", tone: "info" },
      },
    },
    {
      tag: "idea",
      head: "Dice and ending are strategies",
      line: "Random or fixed dice. Exact, finish or bounce at the end.",
      scene: { kind: "classes", spec: classes, stage: 2 },
    },
    {
      tag: "choose",
      head: "What deserves a class",
      line: "Make a class where behaviour really differs.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Snake, Ladder", tone: "bad", why: "Same behaviour, opposite direction" },
          { label: "One jump map", tone: "good", why: "Higher end means ladder" },
          { label: "Dice inside Game", tone: "bad", why: "Tests cannot repeat a roll" },
          { label: "Dice passed in", tone: "good", why: "Fixed rolls make tests exact" },
        ],
      },
      predict: { q: "A test needs the third roll to be a 6. What helps?", options: ["Hope the random dice agree", "Pass in fixed dice"], answer: 1, why: "Injected dice let a test choose every roll." },
    },
    {
      tag: "skip",
      head: "Settle rules before code",
      line: "Three questions decide the whole design.",
      scene: {
        kind: "versus",
        left: { title: "Ask first", points: ["Overshoot: stay, finish, bounce?", "Do jumps chain?", "Does a six repeat?"] },
        right: { title: "Then code", points: ["Ending rule as strategy", "Dice injected", "Bad boards refused"] },
      },
    },
  ],
};
