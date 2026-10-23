import { interviewFramework } from "../../learn/10-interview-playbook/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "Same steps every time",
      body: "A system design round is about 45 minutes. Run the same six steps each time: requirements, numbers, API and data, design, deep dives, trade-offs. Nerves then cannot make you skip one.",
      eg: "A pilot's checklist",
      example: "Pilots with thousands of hours still read the checklist before take-off. It is not for lack of skill: it stops a busy moment from skipping a step.",
    },
    {
      head: "Ask before you draw",
      body: "Spend the first five minutes on what to build and for how many people. A design for a hundred users and one for a hundred million look nothing alike.",
      eg: "An architect's first visit",
      example: "An architect asks how many people will live in the house and what they need before sketching. A flat and a hotel need very different plans.",
    },
    {
      head: "Let numbers pick the parts",
      body: "Quick estimates tell you when a single server is enough and when you need a cache, copies or shards. Each number should end in so we need.",
      eg: "Packing for a trip",
      example: "Two nights fits in a backpack; two weeks needs a suitcase. You check the length of the trip before you choose the bag.",
    },
    {
      head: "Say why, and the cost",
      body: "Interviewers score your reasoning, not one right answer. Say every choice as I use X because Y, and the cost is Z.",
      eg: "A doctor explaining treatment",
      example: "A good doctor says this medicine because of your symptoms, and it may make you drowsy. You trust the advice because you hear the trade.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "Nervous, so you improvise",
      line: "Without fixed steps, nerves decide what you skip. Steps cover every scored row.",
      scene: {
        kind: "versus",
        left: { title: "No plan", points: ["Jump to Kafka", "Draw in silence", "Skip the numbers"] },
        right: { title: "Same steps", points: ["Scope first", "Numbers, then design", "Two deep dives"] },
      },
    },
    {
      tag: "sum",
      head: "Do the sum on the clock",
      line: "A round is 45 minutes. The design and the deep dives get the most.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Requirements", value: "5 min" },
          { label: "Numbers, API, data", value: "5 min" },
          { label: "High-level design", value: "15 min" },
          { label: "Deep dives", value: "15 min" },
        ],
        result: { label: "Plus 5 to wrap up", value: "45 min" },
        verdict: { text: "Behind? Say so, move on", tone: "info" },
      },
    },
    {
      tag: "sum",
      head: "Let numbers pick the design",
      line: "Drag the writes. Your estimate says when to stop adding boxes.",
      scene: {
        kind: "meter",
        label: "Writes per second",
        unit: "writes/s",
        min: 10,
        max: 100000,
        start: 40,
        log: true,
        stops: [
          { upTo: 1000, verdict: "One Postgres. Skip sharding.", tone: "good" },
          { upTo: 20000, verdict: "Not yet. Bigger box, replicas, cache.", tone: "warn" },
          { upTo: 100000, verdict: "Shard by a hash of the code.", tone: "bad" },
        ],
      },
      predict: { q: "Your estimate says 40 writes a second. Shard?", options: ["Yes, to be safe", "No, one database is enough"], answer: 1, why: "Say so out loud. Multi-region for 40 writes a second is over-engineering." },
    },
    {
      tag: "idea",
      head: "Each step feeds the next",
      line: "Every stage leaves something on the board. Watch the 45 minutes fill in.",
      scene: { kind: "flow", spec: interviewFramework, scenario: "walkthrough" },
    },
    {
      tag: "choose",
      head: "What to say, what to avoid",
      line: "Interviewers score your reasoning, not a perfect answer.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Ask, then draw", tone: "good", why: "Who uses it, and how many?" },
          { label: "Name the cost", tone: "good", why: "X because Y, at the cost of Z" },
          { label: "Tools before needs", tone: "bad", why: "Kafka said before requirements" },
          { label: "Ignore failure", tone: "bad", why: "Every box can die" },
        ],
      },
    },
    {
      tag: "fix",
      head: "Stuck? Go back to numbers",
      line: "Do not guess a tool. Restate the requirements, then scale one step at a time.",
      scene: { kind: "flow", spec: interviewFramework, scenario: "unstuck" },
      predict: { q: "Asked about 10x traffic, you blank. First move?", options: ["Name a trendy tool", "Back to the numbers"], answer: 1, why: "Interviewers score the reasoning. Numbers give you something to reason from." },
    },
    {
      tag: "skip",
      head: "Practise before the day",
      line: "Run it aloud and on a timer. Redo each question with gaps.",
      scene: {
        kind: "versus",
        left: { title: "Each run", points: ["Timer on", "Think aloud", "Score each row 1 to 4"] },
        right: { title: "Redo after", points: ["3 days", "7 days", "21 days"] },
      },
    },
  ],
};
