import { lruCache, swapAndPop } from "../../dsa/patterns/23-design-data-structures/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "A class with a speed limit",
      body: "A design question gives you a class with methods and says each must be fast, usually O(1). No single built-in structure is fast at everything, so you combine two or three.",
      eg: "A library desk",
      example: "The desk needs to find any book by title at once, and to know which book nobody has borrowed for ages. A catalogue finds books fast, a shelf in borrowing order shows the oldest.",
      doodle: "hash-map",
    },
    {
      head: "Each structure has one strength",
      body: "A hash map finds a key in one step but keeps no order. A list keeps order but must be searched. An array picks by position instantly. Pair them so each covers the other's weakness.",
      eg: "Name tags and a queue",
      example: "At a party, name tags find a guest quickly, and the order they arrived tells you who has been waiting longest. You need both lists to answer both questions.",
    },
    {
      head: "A cache that forgets the oldest",
      body: "A cache holds a few items and must drop one when full. Least recently used (LRU) drops the item untouched for longest. The map finds the item and the list order says who goes.",
      eg: "Your phone's recent apps",
      example: "You open an app and it jumps to the front of the list. When the phone runs out of room, it closes the app at the very back.",
    },
    {
      head: "The price and when to stop",
      body: "Two structures mean two things to keep in step. Every change must update both, or they disagree and bugs follow. If a plain Map or array already meets the speed limit, use it.",
      eg: "Two address books",
      example: "If you keep a phone book and a birthday book, adding a friend means writing in both. Forget one and your two books tell different stories.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "One structure is not enough",
      line: "A hash map finds a key at once, but scanning it for the oldest entry is slow.",
      scene: {
        kind: "versus",
        left: { title: "Map only", points: ["Find a key in O(1)", "No idea who is oldest", "Eviction scans everything"] },
        right: { title: "List only", points: ["Order is always known", "Finding a key scans it", "Every get is O(n)"] },
      },
    },
    {
      tag: "idea",
      head: "Pair them, keep both in step",
      line: "The map finds the entry. The order says who leaves. A hit moves a key to the end.",
      scene: { kind: "trace", trace: lruCache, preset: "Short run" },
      predict: { q: "The cache is full. Which key is evicted?", options: ["The newest one", "The front of the order"], answer: 1, why: "The front was used longest ago, and removing it is one step." },
    },
    {
      tag: "sum",
      head: "Constant steps per call",
      line: "With 200,000 calls, scanning the cache each time is billions of steps. The pair stays flat.",
      scene: {
        kind: "bars",
        bars: [
          { label: "Scan for oldest", value: 100, shown: "~2 billion", tone: "bad" },
          { label: "Map + list", value: 3, shown: "~200,000", tone: "good" },
        ],
      },
    },
    {
      tag: "choose",
      head: "Which structures fit which need",
      line: "Name what each method needs, then match a structure to it.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Evict the oldest", tone: "good", why: "Map plus linked list" },
          { label: "Random member", tone: "good", why: "Array plus index map" },
          { label: "Value in the past", tone: "good", why: "Sorted history, binary search" },
          { label: "One simple lookup", tone: "warn", why: "A plain Map is enough" },
        ],
      },
      predict: { q: "Remove from the middle of an array in O(1)?", options: ["Splice it out", "Swap in the last element, pop"], answer: 1, why: "Swap and pop shifts nothing, so it is O(1)." },
    },
    {
      tag: "idea",
      head: "The last element fills the hole",
      line: "A set does not care about order, so the last element can take the removed slot.",
      scene: { kind: "trace", trace: swapAndPop, preset: "Remove from the middle" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs are a forgotten update on one of the two structures.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Map and list disagree", "Treating put as no use", "Moved index not updated"] },
        right: { title: "The fix", points: ["Update both every time", "Refresh on every touch", "Re-point the moved item"] },
      },
    },
  ],
};
