import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";
import { classes } from "../../questions/tic-tac-toe/diagrams";

// X plays the middle cell of a 3 by 3 board. "win" is the move that fills a diagonal, "reject" is a taken cell.
const play: FlowSpec = {
  id: "story-tic-tac-toe",
  title: "One move",
  description: "The game checks the move, the board keeps the totals.",
  nodes: [
    { id: "player", label: "Player", kind: "client", col: 0, row: 1 },
    { id: "game", label: "Game", kind: "service", col: 1, row: 1 },
    { id: "board", label: "Board totals", kind: "cache", col: 2, row: 1 },
  ],
  edges: [
    { from: "player", to: "game" },
    { from: "game", to: "board" },
  ],
  scenarios: [
    {
      id: "win",
      name: "A winning move",
      steps: [
        { edge: "player>game", caption: "X has 0,0 and 1,1. X plays 2,2." },
        { edge: "game>board", caption: "Add +1 to the diagonal total. It becomes 3.", mark: [{ node: "board", state: "hit" }] },
        { edge: "game>board", reverse: true, tone: "ok", caption: "3 equals the board size, so the line is full." },
        { edge: "player>game", reverse: true, tone: "ok", caption: "WIN. The game is over." },
      ],
    },
    {
      id: "reject",
      name: "A taken cell",
      steps: [
        { edge: "player>game", caption: "O tries 1,1, but X already holds it.", mark: [{ node: "board", state: null }] },
        { edge: "game>board", caption: "Is 1,1 free?" },
        { edge: "game>board", reverse: true, tone: "miss", caption: "No, it is taken." },
        { edge: "player>game", reverse: true, tone: "miss", caption: "INVALID_MOVE. Nothing changed, and it is still O's turn." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Scanning every move",
      line: "Checking whole lines after each move adds up on a big board.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Board", value: "500 by 500" },
          { label: "Cells per check", value: "~2,000" },
          { label: "Moves in a game", value: "250,000" },
        ],
        result: { label: "Cells scanned", value: "500,000,000" },
        verdict: { text: "Scanning does not scale", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Keep a total per line",
      line: "X adds +1, O adds -1. A full line reaches the board size.",
      scene: { kind: "flow", spec: play, scenario: "win" },
      predict: { q: "A row holds X, O, X. Is its total 3?", options: ["Yes", "No, it is 1"], answer: 1, why: "+1, -1, +1 is 1. A mixed line never reaches 3." },
    },
    {
      tag: "idea",
      head: "Reject before you change",
      line: "A bad move leaves the board and the turn untouched.",
      scene: { kind: "flow", spec: play, scenario: "reject" },
    },
    {
      tag: "sum",
      head: "When to count, not scan",
      line: "Drag the board size.",
      scene: {
        kind: "meter",
        label: "Board side",
        unit: "cells",
        min: 3,
        max: 500,
        start: 3,
        log: true,
        stops: [
          { upTo: 5, verdict: "Scanning is fine.", tone: "good" },
          { upTo: 30, verdict: "Either works. Totals are neater.", tone: "warn" },
          { upTo: 500, verdict: "Use running totals.", tone: "info" },
        ],
      },
      predict: { q: "On a plain 3 by 3, do you need totals?", options: ["Yes, always", "No, scanning is fine"], answer: 1, why: "Nine cells are trivial. Totals answer the n by n follow-up." },
    },
    {
      tag: "choose",
      head: "What gets a class?",
      line: "A class needs a job of its own.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Board", tone: "good", why: "Owns lines and totals" },
          { label: "Game", tone: "good", why: "Owns turn and ending" },
          { label: "Bot", tone: "good", why: "A real second rule" },
          { label: "Player", tone: "bad", why: "Would hold one string" },
          { label: "WinChecker", tone: "bad", why: "One implementation" },
        ],
      },
    },
    {
      tag: "fix",
      head: "The opponent is swappable",
      line: "A bot maps board and mark to a cell.",
      scene: { kind: "classes", spec: classes, stage: 3 },
    },
    {
      tag: "catch",
      head: "Two tabs, one move",
      line: "Both clients send a move at the same moment.",
      scene: {
        kind: "versus",
        left: { title: "No version", points: ["Both moves apply", "The turn goes wrong"] },
        right: { title: "Lock plus version", points: ["One move goes first", "The other is stale", "It refreshes and retries"] },
      },
    },
  ],
};
