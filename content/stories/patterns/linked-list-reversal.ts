import { reverseList, reverseSegment, weaveHalves } from "../../dsa/patterns/09-linked-list-reversal/viz";
import type { Story } from "../types";

export const story: Story | undefined = {
  steps: [
    {
      tag: "pain",
      head: "Cut a link, lose the list",
      line: "Each car is coupled only to the one behind. Overwrite the link first and the rest is gone.",
      scene: {
        kind: "versus",
        left: { title: "Flip first", points: ["curr.next = prev", "Nothing points at the rest", "The tail of the list is lost"] },
        right: { title: "Save first", points: ["Save curr.next", "Then flip the arrow", "Then step forward"] },
      },
    },
    {
      tag: "idea",
      head: "Save, flip, advance",
      line: "Three pointers walk the list. Every node's arrow turns around once.",
      scene: { kind: "trace", trace: reverseList, preset: "Two nodes" },
      predict: { q: "What does prev start as?", options: ["The head", "null"], answer: 1, why: "The old head becomes the tail, so it points at nothing." },
    },
    {
      tag: "sum",
      head: "Rewire, do not copy",
      line: "Copying values into an array reverses it too, but costs one slot per node.",
      scene: {
        kind: "sum",
        rows: [
          { label: "Nodes", value: "100,000" },
          { label: "Slots if you copy", value: "100,000" },
        ],
        result: { label: "Extra space if you rewire", value: "O(1)" },
        verdict: { text: "Rewire in place", tone: "good" },
      },
    },
    {
      tag: "idea",
      head: "Reverse part, then splice",
      line: "Stand before the part and reverse k nodes. Then fix the two end links.",
      scene: { kind: "trace", trace: reverseSegment, preset: "Middle segment" },
    },
    {
      tag: "choose",
      head: "Spot it in the problem",
      line: "Changing links in place, or reading the back half backwards, is the clue.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "Reverse a list", tone: "good", why: "Flip every arrow" },
          { label: "Head may go", tone: "good", why: "Put a dummy in front" },
          { label: "Palindrome list", tone: "good", why: "Reverse the back half" },
          { label: "Count from the end", tone: "warn", why: "Keep a fixed gap, with a dummy" },
        ],
      },
      predict: { q: "The head might be removed. What goes in front?", options: ["Nothing, special-case it", "A dummy node"], answer: 1, why: "The head gets a predecessor, so no special case." },
    },
    {
      tag: "idea",
      head: "Split, reverse, weave",
      line: "Cut the middle, reverse the back half, then link one node from each half in turn.",
      scene: { kind: "trace", trace: weaveHalves, preset: "Halves of 1…5" },
    },
    {
      tag: "catch",
      head: "The usual slips",
      line: "Most bugs come from returning the wrong node or skipping a check.",
      scene: {
        kind: "versus",
        left: { title: "Common slips", points: ["Returning the old head", "Reversing without cutting first", "Reading node.next.next unchecked"] },
        right: { title: "The fix", points: ["Return prev or dummy.next", "Cut with slow.next = null", "Check node.next first"] },
      },
    },
  ],
};
