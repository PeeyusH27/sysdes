import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "two-pointers": {
    what: "Put one finger at each end of a row, or one behind the other, and move them toward each other. A finger is a pointer, just an index that marks a spot. Each move rules one item out for good.",
    why: "Checking every pair of 1,000 numbers takes about 500,000 checks. Two pointers need about 1,000 steps, because no item is looked at twice. Nested loops of O(n²) become one pass of O(n).",
    example: "Two shoppers walk along a price-sorted shelf from opposite ends, hunting two items that cost exactly 50. Total too low, the cheap-end shopper steps up. Total too high, the pricey-end shopper steps down.",
    when: "Use it when the data is sorted or may be sorted, and you want a pair that hits a target, a palindrome check, or in-place changes. Skip it if you cannot say why a step rules an item out.",
  },
  "sliding-window": {
    what: "A window is a frame over a stretch of neighbouring items. Slide it one step: one item enters, one leaves. You update your answer with those two changes instead of recounting the whole frame.",
    why: "Re-adding a 30 day window on every day of 1,000 days is about 30,000 additions. Updating by one in and one out is about 1,000. That turns O(n · k) into O(n).",
    example: "A dashboard shows sales for the last 7 days. When midnight passes, it adds today's sales and subtracts the day that just fell out. The 7 day frame is the window.",
    when: "Use it for the longest, shortest or best stretch of neighbouring items that follows a rule, such as at most k different letters. Be careful with negative numbers, which can break the rule.",
  },
  "prefix-sum": {
    what: "A prefix sum is a running total, saved after each item. The sum of any stretch is then one subtraction: the total at its end minus the total just before its start.",
    why: "Adding up a range from scratch costs its length each time. Build the totals once and every range costs one subtraction. A thousand questions on a thousand numbers drop from up to a million additions to about 2,000 steps.",
    example: "Your bank statement shows the balance after each day. To find what you spent between day 10 and day 20, subtract the day 20 balance from the day 10 balance. No need to read every purchase.",
    when: "Use it when you ask for many range sums on data that stays the same, or for subarrays that add up to k. It works with negative numbers. It does not work for max or min.",
  },
  stack: {
    what: "A stack is a pile where you only touch the top. The last item put on is the first one taken off. This is exactly the order that nested things close in.",
    why: "When something closes, a stack hands you the newest open item at once, with no searching. A monotonic stack, which keeps its items in sorted order, answers every next bigger value question in one pass of O(n) instead of O(n²).",
    example: "The undo button in a text editor. Every edit goes on top of a pile. Undo takes the newest edit off the top, never one from the middle. The pile of edits is the stack.",
    when: "Use it when things open and close in nested pairs, like brackets, when you undo the latest action, or when each item needs its next greater or smaller neighbour.",
  },
  intervals: {
    what: "An interval is a start and an end, like a meeting from 2 to 4. Two intervals overlap when each one starts before the other ends. Sort them by start time and then walk through them once.",
    why: "Comparing every pair of meetings takes O(n²). After sorting, only neighbours can clash, so one sweep does the job. The whole thing costs O(n log n), almost all of it the sorting.",
    example: "A company books meeting rooms. Draw each meeting as a bar on a day calendar. The most bars stacked at any one moment is the number of rooms you need.",
    when: "Use it when the input is a list of start and end pairs and the question is about overlap: merge, clash, insert, or minimum rooms. A meeting ending at 3 and one starting at 3 do not clash.",
  },
  "fast-slow-pointers": {
    what: "Send two runners along a list of linked items. A pointer is a marker for where each runner stands. The slow one moves one step at a time. The fast one moves two steps.",
    why: "To spot a loop you could remember every item you have seen, which costs O(n) memory. Two runners need only two markers, O(1) extra space, and they find the middle or the loop in one pass.",
    example: "Two joggers on a track. On a straight road, when the fast one reaches the end, the slow one is half way. On a circular track the fast one laps the slow one, so they meet.",
    when: "Use it for a cycle in a linked list, the middle of a list, or a sequence that may repeat forever. Pick it when O(1) extra memory is required. Otherwise a set of seen items is simpler.",
  },
  "linked-list-reversal": {
    what: "A linked list is a chain of nodes, where each node holds a value and points to the next one. To reverse it, you rewire each arrow to point backwards. You change the links, not the values.",
    why: "Copying the list into an array, flipping it and copying back uses O(n) extra memory. Rewiring in place uses O(1) extra memory and touches each node once. The risk is losing the rest of the chain, so you save it first.",
    example: "A train where each car is coupled only to the car behind it. To reverse it, note which car is behind, uncouple, and couple this car to the one ahead. Repeat down the train.",
    when: "Use it to reverse a list or part of it, merge two sorted lists, remove the nth node from the end, or reorder nodes. Look for the words in place or O(1) extra memory.",
  },
  "tree-dfs": {
    what: "A tree is a root with smaller trees hanging below it. Depth-first search goes all the way down one branch before trying the next. Solve each smaller tree first, then combine their answers at the root.",
    why: "You write only two things: the answer for an empty tree, and how to combine the two answers below. The same few lines then work on any shape of tree, visiting each node once in O(n).",
    example: "A manager wants the headcount of the whole team. She asks each of her two leads for their team count, then adds 1 for herself. The leads do the same. Nobody needs to see the whole company.",
    when: "Use it for questions about whole subtrees such as height, size or balance, for root-to-leaf paths, for the longest path anywhere, and for checking a search tree. Use BFS for level questions.",
  },
  "tree-bfs": {
    what: "Breadth-first search reads a tree one level at a time: the root, then its children, then their children. A queue, which is a line where the first in is the first out, keeps the levels in order.",
    why: "The shallowest nodes always come out first, so you can stop at the first match and know it is the nearest one. Level by level also gives per-row answers directly. It costs O(n) time.",
    example: "Find the highest-ranking French speaker in a company. Check the CEO, then all directors, then all managers, level by level. The first speaker found is the closest to the top. The waiting line is the queue.",
    when: "Use it when the answer is per level, like each row's average, when you need the view from one side, or the nearest or shallowest match such as minimum depth.",
  },
  trie: {
    what: "A trie stores words letter by letter along paths from a top node. Words that start the same share the same first nodes. Each node stands for a prefix, the letters typed so far.",
    why: "Looking up a word takes one step per letter, O(L) for a word of length L, whether you store ten words or a million. Asking which words start with ca would otherwise mean scanning every word.",
    example: "Autocomplete on your phone. Each letter you type moves one step down the tree. After c and a, you stand at the node for ca, and every suggestion lies somewhere below it.",
    when: "Use it for prefix questions, autocomplete, a dictionary matched against text or a grid, or wildcard search where a dot means any letter. For plain whole-word lookup, a hash set is simpler.",
  },
  heaps: {
    what: "A heap is a pile that always keeps the best item on top, the smallest or the largest. Looking at the top is instant. Adding or removing an item takes about log n steps.",
    why: "Sorting everything just to get the top few wastes work. A heap is only about 20 levels deep for a million items, so each update costs about 20 swaps at most. It also works on a live stream.",
    example: "A game keeps the best 10 scores. The board holds 10 entries, and the lowest one sits on top. A new score that beats the lowest replaces it. The board is the heap.",
    when: "Use it for the k largest, smallest or most frequent, to merge k sorted lists, or for a running median. Use it when you need the best item again and again, not just once.",
  },
};
