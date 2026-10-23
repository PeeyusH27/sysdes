import type { FlowSpec } from "@/components/diagram/types";
import type { Story } from "../types";

// A customer, the machine, its spiral and the coin tubes. "flags" is the double press with loose flags,
// "table" is the same press with a state table, "jam" is an item that never drops.
const machine: FlowSpec = {
  id: "story-vending-machine",
  title: "A double press on the select button",
  description: "A customer pays and selects. The machine turns the spiral and watches the drop sensor.",
  nodes: [
    { id: "cust", label: "Customer", kind: "client", col: 0, row: 1 },
    { id: "vm", label: "Machine", kind: "service", col: 1, row: 1 },
    { id: "spiral", label: "Spiral, sensor", kind: "worker", col: 2, row: 0 },
    { id: "tubes", label: "Coin tubes", kind: "cache", col: 2, row: 2 },
  ],
  edges: [
    { from: "cust", to: "vm" },
    { from: "vm", to: "spiral" },
    { from: "vm", to: "tubes" },
  ],
  scenarios: [
    {
      id: "flags",
      name: "Loose flags",
      steps: [
        { edge: "cust>vm", caption: "A customer inserts $1 and selects a 65 cent cola." },
        { edge: "vm>spiral", caption: "The spiral starts turning.", mark: [{ node: "spiral", state: "busy" }] },
        { edge: "cust>vm", tone: "error", caption: "They press select again while it turns." },
        { edge: "vm>spiral", tone: "error", caption: "No guard stops it. A second cola drops.", mark: [{ node: "vm", state: "down" }] },
        { edge: "vm>spiral", reverse: true, tone: "error", caption: "Two colas for 65 cents." },
      ],
    },
    {
      id: "table",
      name: "State table",
      steps: [
        { edge: "cust>vm", caption: "Same customer, $1 in, select pressed.", mark: [{ node: "vm", state: null }, { node: "spiral", state: null }] },
        { edge: "vm>spiral", caption: "State is Dispensing. The spiral turns.", mark: [{ node: "vm", state: "busy" }] },
        { edge: "cust>vm", tone: "miss", caption: "A second select arrives in Dispensing." },
        { edge: "cust>vm", reverse: true, tone: "miss", caption: "The table says rejected. Nothing changes." },
        { edge: "vm>spiral", reverse: true, caption: "The drop sensor confirms the cola fell." },
        { edge: "vm>tubes", tone: "ok", caption: "Coins move to the tubes, once.", mark: [{ node: "vm", state: "ok" }] },
      ],
    },
    {
      id: "jam",
      name: "Item stuck",
      steps: [
        { edge: "cust>vm", caption: "A customer pays 65 cents and selects." },
        { edge: "vm>spiral", caption: "The spiral turns. The coins wait in escrow.", mark: [{ node: "spiral", state: "busy" }] },
        { edge: "vm>spiral", reverse: true, tone: "error", caption: "No drop in 2 s. Retry once, still nothing.", mark: [{ node: "spiral", state: "down" }] },
        { edge: "cust>vm", reverse: true, tone: "ok", caption: "Refund the same coins and flag the slot." },
      ],
    },
  ],
};

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "A double press, a free cola",
      line: "A guard is missed mid-drop, and the machine hands out twice.",
      scene: { kind: "flow", spec: machine, scenario: "flags" },
      predict: { q: "Select is pressed twice mid-drop. How many colas?", options: ["One", "Two"], answer: 1, why: "Nothing says select is illegal while dispensing, so it runs again." },
    },
    {
      tag: "sum",
      head: "Count what flags allow",
      line: "Three yes/no flags allow more states than the machine really has.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Flags", value: "3" },
          { label: "Combinations", value: "8" },
        ],
        result: { label: "Legal states", value: "4" },
        verdict: { text: "Half the combinations are impossible", tone: "bad" },
      },
    },
    {
      tag: "sum",
      head: "When is a table worth it?",
      line: "Drag the cells: states times events.",
      scene: {
        kind: "meter",
        label: "States times events",
        unit: "cells",
        min: 2,
        max: 40,
        start: 4,
        log: true,
        stops: [
          { upTo: 6, verdict: "A toy: one if is fine.", tone: "good" },
          { upTo: 15, verdict: "Borderline. A table starts to pay.", tone: "warn" },
          { upTo: 40, verdict: "Use a table. Test every cell.", tone: "info" },
        ],
      },
      predict: { q: "A toy with 2 states and 2 events. A full table?", options: ["Yes, always", "No, one if is fine"], answer: 1, why: "Four cells are easy to read. The table earns its keep as cells grow." },
    },
    {
      tag: "idea",
      head: "One outcome in every cell",
      line: "Dispensing refuses select. A missing cell means rejected.",
      scene: { kind: "flow", spec: machine, scenario: "table" },
    },
    {
      tag: "choose",
      head: "Handle money exactly",
      line: "Cheap shortcuts here lose real coins.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Float prices", tone: "bad", why: "0.1 + 0.2 is not 0.3" },
          { label: "Integer cents", tone: "good", why: "A cola costs 65, not 0.65" },
          { label: "Greedy change", tone: "bad", why: "Owe 30, takes 25, lacks a 5" },
          { label: "Bounded DP change", tone: "good", why: "Uses real coins: 10 + 10 + 10" },
          { label: "Escrow then commit", tone: "good", why: "A jam refunds the same coins" },
        ],
      },
      predict: { q: "Owe 30 cents, with one 25 and three 10s. Greedy works?", options: ["Yes", "No"], answer: 1, why: "Greedy takes the 25, then needs a 5 the machine lacks." },
    },
    {
      tag: "catch",
      head: "The item never drops",
      line: "Paid, but nothing fell. Escrow lets the machine return the coins.",
      scene: { kind: "flow", spec: machine, scenario: "jam" },
    },
    {
      tag: "skip",
      head: "When one if is enough",
      line: "Tiny logic needs no table. Money logic does.",
      scene: {
        kind: "versus",
        left: { title: "One if", points: ["Two states, two events", "No money at stake"] },
        right: { title: "A state table", points: ["Many states and events", "A wrong cell costs money", "Tests loop over every pair"] },
      },
    },
  ],
};
