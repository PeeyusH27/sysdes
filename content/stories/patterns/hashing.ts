import { pairCount, seenSet } from "../../dsa/patterns/01-hashing/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "A map is a notebook with tabs",
      body: "A hash map stores pairs of a key and a value, and finds a key in one step however many are stored. A set is the same idea with keys only, for asking whether you have seen something.",
      eg: "A coat check",
      example: "You hand over a coat and get ticket 42. Later you show the ticket and the attendant walks straight to the right hook. Nobody searches the whole rack.",
      doodle: "hash-map",
    },
    {
      head: "Why one step, not a search",
      body: "A hash function turns the key into a position in memory, so the map jumps straight there. Searching a list instead means checking items one by one, which slows down as the list grows.",
      eg: "A gym locker number",
      example: "Your locker number tells you exactly where to walk. Nobody checks every locker to find yours, however many lockers the gym has.",
    },
    {
      head: "Remember what you have seen",
      body: "Walk through the data once. For each value, ask the map whether you have met it, or its partner, before. Then write it down. The map is your memory of everything so far.",
      eg: "Spotting a repeat guest",
      example: "At a party you note each name as it arrives. When a name comes up that you already noted, you know it is a repeat without scanning the whole guest list.",
    },
    {
      head: "Counting and grouping",
      body: "A map can hold counts or groups. Use the item as the key and a number or a list as the value. How many times, or which words belong together, becomes one pass.",
      eg: "Tallying votes",
      example: "A teller reads each ballot aloud and ticks a mark beside that name. At the end the tallies are ready, and no ballot was read twice.",
    },
    {
      head: "The price is memory",
      body: "A map buys speed with memory, roughly one entry per item. If memory is tight, sort the data instead: slower, but it needs almost no extra space.",
      eg: "Index cards for every book",
      example: "Keeping a card for each book makes lookups instant but fills a drawer. Skipping the cards saves space and costs you a long hunt every time.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "Every number scans the rest",
      line: "To ask whether you have seen a value, the nested loop searches all the others.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Numbers", value: "100,000" },
          { label: "Search per number", value: "up to 100,000" },
        ],
        result: { label: "Steps in total", value: "~10 billion" },
        verdict: { text: "Far too slow", tone: "bad" },
      },
    },
    {
      tag: "idea",
      head: "Write it down as you pass",
      line: "The set remembers every value passed. Asking it costs one step, not a scan.",
      scene: { kind: "trace", trace: seenSet, preset: "Has a repeat" },
      predict: { q: "The set holds 4, 7, 2, 9. Next comes 7. What happens?", options: ["Add it again", "Repeat found"], answer: 1, why: "One lookup finds it. No scanning backwards." },
    },
    {
      tag: "sum",
      head: "One pass, one lookup each",
      line: "Time drops to O(n). The notebook costs O(n) memory.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Nested loop", value: 100, shown: "10 billion", tone: "bad" },
          { label: "Hash map", value: 3, shown: "100,000", tone: "good" },
        ],
      },
    },
    {
      tag: "idea",
      head: "Look up first, then write",
      line: "A pair is found at its second element. Insert first and a value pairs with itself.",
      scene: { kind: "trace", trace: pairCount, preset: "No self-pairs" },
      predict: { q: "Target 6. The first value is 3. Does it pair with itself?", options: ["Yes", "No"], answer: 1, why: "It is not in the map yet when we look, so it only finds earlier values." },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Seen before, a partner, or a count in unsorted data.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Seen before?", tone: "good", why: "One lookup per value" },
          { label: "Pair adds to k", tone: "good", why: "Ask for target minus x" },
          { label: "Count or group", tone: "good", why: "Counts, or a shared key" },
          { label: "Memory is tight", tone: "warn", why: "Sort instead: slower, little memory" },
        ],
      },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Order and truthiness cause most bugs.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Insert first: 3 pairs with itself", "if (map.get(k)) when value is 0"] },
        right: { title: "The fix", points: ["Look up, then insert", "Use has(), not a truthy get"] },
      },
    },
  ],
};
