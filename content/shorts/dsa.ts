import type { Short } from "./types";

// Shorts for the DSA patterns (content/dsa/patterns) and the JavaScript cheat sheet (content/dsa/js).
export const shorts: Short[] = [
  // ─── DSA patterns, in path order ───────────────────────────────────────────
  {
    id: "hashing-pattern",
    track: "DSA",
    topic: "Hashing",
    title: "Replace the inner search with one O(1) lookup",
    hook: "Most O(n²) brute forces only scan for a partner or a repeat, and a hash map turns that scan into one O(1) lookup.",
    points: [
      "Spot it: you keep asking **\"have I seen this before?\"**, or you need **how many times** something occurs.",
      "Spot it: each element needs a **partner** such as `target - x`, or items that share a property must be **grouped**.",
      "Store what each element tells you as you pass it: **presence** in a `Set`, or a **count, index or group** in a `Map`.",
      "The map describes only the elements **before** the current one, so **look up, then insert**: nothing pairs with itself.",
    ],
    more: [
      {
        title: "Template",
        points: [
          "**Seen set**: `has`, then `add`. **Frequency map**: count once, then answer \"how many?\" in O(1).",
          "Group by a **canonical key** that makes equivalent items collide: sorted letters for anagrams, `\"r,c\"` for cells.",
          "For lowercase letters, an array of 26 indexed by `ch.charCodeAt(0) - 97` is a **perfect hash**: faster than a `Map`.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time with O(1) average lookups, paid for with **O(n)** memory. Grouping by sorted key costs O(n · k log k)."],
      },
      {
        title: "Watch out",
        points: [
          "Inserting before looking up lets an element **pair with itself**: `[3, 4]` with target 6 returns `[0, 0]`.",
          "`if (map.get(k))` fails when the stored index or count is `0`. Use **`has`**.",
          "Arrays and objects as keys never match a fresh copy: **encode** composite keys as strings or numbers.",
        ],
      },
    ],
    code: `function countPairs(nums, target) {
  const seen = new Map(); // value -> times seen so far
  let pairs = 0;
  for (const x of nums) {
    pairs += seen.get(target - x) ?? 0;  // look up first...
    seen.set(x, (seen.get(x) ?? 0) + 1); // ...then record x
  }
  return pairs;
}`,
    say: "I'd trade O(n) memory for time: store each value in a hash map as I pass it, and look up its complement before inserting, so the nested loop becomes one O(n) pass.",
    source: "/dsa/patterns/hashing#the-core-idea-replace-the-inner-search-with-a-lookup",
  },
  {
    id: "two-pointers-pattern",
    track: "DSA",
    topic: "Two pointers",
    title: "Two indices, one pass: every step rules an element out",
    hook: "On sorted or mirrored input, two pointers replace an O(n²) nested loop with one O(n) pass and usually O(1) extra space.",
    points: [
      "Spot it: the input is **sorted** (or you may sort it) and you need a **pair or triplet** with a target sum.",
      "Spot it: the answer must be built **in place**, or you compare a string with its **mirror image**.",
      "If `nums[left] + nums[right]` is too small, `nums[left]` is too small for every remaining partner: **drop it** with `left++`.",
      "Each comparison discards one index for good. If you can't say **what is ruled out**, two pointers is the wrong tool.",
    ],
    more: [
      {
        title: "Variants",
        points: [
          "**Opposite ends** for sorted pairs and palindromes, **read/write** pointers to compact in place, one per input to merge.",
          "Unsorted input and you need the original indices: use a **hash map** instead.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time and O(1) space on sorted input, **O(n log n)** if you sort first. 3Sum (fix one, then walk) is O(n²)."],
      },
      {
        title: "Watch out",
        points: [
          "`nums.sort()` without a comparator compares **strings**: `[10, 9, 1]` becomes `[1, 10, 9]`.",
          "`left <= right` lets an element **pair with itself**. Pairs need `left < right`.",
          "Forgetting to move a pointer after recording a match means the loop **never ends**.",
        ],
      },
    ],
    code: `function pairSum(nums, target) { // nums sorted ascending
  let left = 0, right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left++; // nums[left] is too small for all
    else right--;             // nums[right] is too big for all
  }
  return [-1, -1];
}`,
    say: "The array is sorted, so the sum at the two ends tells me which end can't be in any pair. Each step discards one index, so it's O(n) time and O(1) space.",
    source: "/dsa/patterns/two-pointers#the-core-idea-every-step-discards-something",
  },
  {
    id: "sliding-window-pattern",
    track: "DSA",
    topic: "Sliding window",
    title: "Update the window as it slides instead of recomputing it",
    hook: "Each element enters the window once and leaves once, so an O(n · k) or O(n²) scan over subarrays becomes O(n).",
    points: [
      "Spot it: the answer is a **contiguous** subarray or substring, and you want the longest, the shortest or a count.",
      "Spot it: the rule has a bound (**at most k** distinct, sum at least target, no repeats) or a **fixed size** k.",
      "Keep `[left, right]` plus a **running summary** (a sum, a `Map` of counts, a `Set`) and update it as elements enter and leave.",
      "A variable window needs a **monotonic rule**: shrinking a valid window keeps it valid, so `left` never moves back.",
    ],
    more: [
      {
        title: "When left moves",
        points: [
          "Fixed: once wider than k. **Longest**: shrink while invalid, then record. **Shortest**: shrink while valid, recording each time.",
          "For a window maximum or minimum, a **monotonic deque** of indices keeps the scan O(n).",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)**: neither pointer moves backwards, so the `while` inside the `for` makes at most 2n moves in total."],
      },
      {
        title: "Watch out",
        points: [
          "Shrinking with `if` instead of **`while`** leaves the window invalid when several elements must go.",
          "Decrementing a count without deleting it at zero makes **`count.size`** overstate the distinct values.",
          "Negative numbers break sum windows: use **prefix sums** instead.",
        ],
      },
    ],
    code: `function longestNoRepeat(s) {
  const inWindow = new Set();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    while (inWindow.has(s[right])) inWindow.delete(s[left++]);
    inWindow.add(s[right]);
    best = Math.max(best, right - left + 1); // record after shrinking
  }
  return best;
}`,
    say: "I'd grow right every step, shrink left while the rule is broken, then record. Neither pointer moves back, so each index enters and leaves once: O(n).",
    source: "/dsa/patterns/sliding-window#the-core-idea-update-dont-recompute",
  },
  {
    id: "prefix-sum-pattern",
    track: "DSA",
    topic: "Prefix sums",
    title: "Any range sum is one subtraction of two prefixes",
    hook: "Build running totals once in O(n) and every range-sum question after that costs O(1), even with negative numbers.",
    points: [
      "Spot it: the **sum of a range** asked many times, or **subarray sums to k** on data that may hold negatives.",
      "Spot it: many **range updates** (add 5 to seats 3 to 9) followed by one read: that's a **difference array**.",
      "With `prefix[0] = 0`, `sum(l..r) = prefix[r + 1] - prefix[l]`. The **leading 0** handles ranges that start at index 0.",
      "A subarray ending at j sums to k when an **earlier prefix** equals `sum - k`: a **hash map** lookup.",
    ],
    more: [
      {
        title: "Template",
        points: [
          "Counting subarrays: map prefix sum to count, **seeded 0 → 1**. Longest: map to the first index, **seeded 0 → -1**.",
          "Difference array: `+delta` where a range starts, `-delta` just after it ends, then **one running sum** rebuilds the values.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** to build, then **O(1)** per range query. Prefix sum + hash map is one O(n) pass with O(n) memory."],
      },
      {
        title: "Watch out",
        points: [
          "Forgetting the **seed** misses subarrays that start at index 0.",
          "Inserting the current sum before looking up `sum - k` counts **empty subarrays** when k is 0.",
          "Reading past either end returns `undefined`, and `5 - undefined` is **NaN**, not an error.",
        ],
      },
    ],
    code: `function countSubarrays(nums, k) { // subarrays summing to k
  const seen = new Map([[0, 1]]); // the empty prefix, seen once
  let sum = 0, count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) ?? 0; // look up first...
    seen.set(sum, (seen.get(sum) ?? 0) + 1); // ...then record
  }
  return count;
}`,
    say: "I'd keep a running sum and a map of how often each prefix sum has appeared. A subarray ending here sums to k when an earlier prefix equals sum minus k: one O(n) pass.",
    source: "/dsa/patterns/prefix-sum#the-core-idea-a-range-is-the-difference-of-two-prefixes",
  },
  {
    id: "binary-search-pattern",
    track: "DSA",
    topic: "Binary search",
    title: "Halve the range that must contain the answer",
    hook: "Halving means a million candidates need about 20 checks, and it works on anything monotonic, including the answer itself.",
    points: [
      "Spot it: the input is **sorted or rotated**, or you need the **first or last position** or an insert point.",
      "Spot it: \"**minimum** speed or capacity such that…\", \"minimise the maximum\", or answers as large as 10^9.",
      "Invariant: if the answer exists it is inside `[lo, hi]`, and each step proves **one half can't hold it**.",
      "Learn one template, **first true**: `ok(x)` goes false then true, loop `lo < hi`, set `hi = mid` or `lo = mid + 1`.",
    ],
    more: [
      {
        title: "Beyond sorted arrays",
        points: [
          "On the answer: search a range of values with a **feasibility check**, from the smallest that could work to one that surely does.",
          "Rotated array: one half is always sorted. Check whether the target sits **inside that half** to choose which to keep.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(log n)** time, O(1) space. On an answer range R with an O(n) check: **O(n log R)**."],
      },
      {
        title: "Watch out",
        points: [
          "`lo <= hi` with `hi = mid` **never ends**; `lo < hi` with `hi = mid - 1` can skip the answer.",
          "`(lo + hi) >> 1` turns **negative** past about 2.1 billion. Use `Math.floor((lo + hi) / 2)`.",
          "A lower bound returns a position even when the target is missing: **check** `nums[i] === target`.",
        ],
      },
    ],
    code: `// First x in [lo, hi) where ok(x) is true, or hi if none.
function firstTrue(lo, hi, ok) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ok(mid)) hi = mid; // mid might be the first true
    else lo = mid + 1;     // mid and everything before fail
  }
  return lo;
}
const lowerBound = (a, x) => firstTrue(0, a.length, (i) => a[i] >= x);`,
    say: "I'd frame it as first true: a yes/no test that flips once, lo < hi, hi = mid when it passes and lo = mid + 1 when it fails. Log n checks, and no off-by-one guessing.",
    source: "/dsa/patterns/binary-search#the-core-idea-a-range-that-must-contain-the-answer",
  },
  {
    id: "stack-pattern",
    track: "DSA",
    topic: "Stacks",
    title: "A stack answers next-greater for every index in one pass",
    hook: "Brackets, undo steps and next-greater lookups all resolve the most recent unfinished item first, which is exactly what a stack hands back.",
    points: [
      "Spot it: things **open and close** in nested order (brackets, tags, `..` in a path), or you **undo** the latest action.",
      "Spot it: for each element, the **next or previous greater or smaller** element, or a span bounded by one.",
      "Matching: push what opens; a closer must match the **top**. Counting isn't enough: `([)]` has one of each bracket.",
      "Monotonic stack: keep indices still **waiting for an answer**. A bigger value pops every smaller one: it is their answer.",
    ],
    more: [
      {
        title: "Template",
        points: [
          "Push **indices**, not values: you need them to fill answer slots and to measure distances like `i - j`.",
          "Flip the comparison for next smaller. Ties depend on **`<` or `<=`**, so read the problem for \"strictly\".",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n) amortised**: every index is pushed once and popped at most once, despite the `while` inside the `for`."],
      },
      {
        title: "Watch out",
        points: [
          "`stack.at(-1)` on an empty stack is `undefined`, and comparisons with it are **silently false**. Check `stack.length`.",
          "Items left on the stack never got an answer: keep the **default** (-1), or flush them with a sentinel.",
          "The top of a JavaScript stack is the **end** of the array. `shift` and `unshift` are O(n).",
        ],
      },
    ],
    code: `function nextGreater(nums) { // index of next bigger value, or -1
  const answer = new Array(nums.length).fill(-1);
  const stack = []; // indices still waiting for an answer
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack.at(-1)] < nums[i])
      answer[stack.pop()] = i; // nums[i] answers every smaller top
    stack.push(i);
  }
  return answer;
}`,
    say: "I'd keep a stack of indices still waiting for a greater value. Each new value pops and answers every smaller one on top. Every index is pushed and popped once, so it's O(n).",
    source: "/dsa/patterns/stack#template-2-monotonic-decreasing-stack-next-greater",
  },
  {
    id: "intervals-pattern",
    track: "DSA",
    topic: "Intervals",
    title: "Sort intervals by start and only neighbours can overlap",
    hook: "Comparing every pair of intervals is O(n²), but after one sort a single sweep merges, inserts or counts overlaps.",
    points: [
      "Spot it: a list of **`[start, end]` pairs** (meetings, bookings, ranges) and a question about **overlap**.",
      "Spot it: \"the minimum number of **rooms**, platforms or arrows\", or \"remove the fewest so none overlap\".",
      "Sorted by start, a group can never grow again once an interval starts **after its end**: close it at the first gap.",
      "Sort by **start** to merge, insert or detect clashes; sort by **end** to keep as many intervals as possible.",
    ],
    more: [
      {
        title: "Counting overlaps",
        points: [
          "Sweep line: **+1 at each start, -1 at each end**, sorted by time with ends first on ties. Track the running maximum.",
          "Or keep a **min-heap of end times**, one per busy room: it also tells you which room each meeting gets.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n log n)** for the sort, then O(n). Inserting into a list that is already sorted is **O(n)**: skip the sort."],
      },
      {
        title: "Watch out",
        points: [
          "`intervals.sort()` compares arrays as **strings**, so `[10, 12]` lands before `[9, 10]`.",
          "Extend with **`Math.max(last[1], end)`**, not `end`: a nested interval would shrink the group.",
          "Decide whether touching intervals overlap: **`<=` or `<`** decides `[1, 3]` and `[3, 5]`.",
        ],
      },
    ],
    code: `function merge(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]); // a gap: start a new group
  }
  return merged;
}`,
    say: "I'd sort by start so only neighbours can overlap, then sweep once: stretch the last group with Math.max, or start a new one at a gap. O(n log n) for the sort.",
    source: "/dsa/patterns/intervals#the-core-idea-sorting-makes-overlap-local",
  },
  {
    id: "fast-slow-pointers-pattern",
    track: "DSA",
    topic: "Fast & slow",
    title: "Find a cycle or the middle of a list in O(1) space",
    hook: "A visited set finds a cycle with O(n) memory, while a pointer moving twice as fast answers the same question with two references.",
    points: [
      "Spot it: a **linked list** that might loop back on itself, or one you must split in half without counting its length.",
      "Spot it: a sequence **defined by a rule** (sum of digit squares, `i → nums[i]`) may repeat, and O(1) space is required.",
      "`slow` takes one step and `fast` two. When `fast` runs out of list, `slow` is at the **middle**.",
      "In a loop, `fast` gains **exactly one node** per step, so the gap shrinks to 0 and they meet instead of skipping past.",
    ],
    more: [
      {
        title: "Finding the entry",
        points: [
          "After the meeting, restart one pointer at the head and step **both by one**: they meet at the loop's entry.",
          "`while (fast && fast.next)` stops on the **second middle** of an even list; `fast.next && fast.next.next` on the first.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time and **O(1)** space for the middle, cycle detection and the cycle's entry."],
      },
      {
        title: "Watch out",
        points: [
          "Comparing `slow === fast` **before the first move**: both start on the head, so every list looks cyclic.",
          "Compare **nodes**, not values: different nodes can hold equal values.",
          "The meeting point is somewhere **inside** the loop, not necessarily its entry.",
        ],
      },
    ],
    code: `function cycleStart(head) { // entry node of the loop, or null
  let slow = head, fast = head;
  do {
    if (!fast || !fast.next) return null; // fell off: no loop
    [slow, fast] = [slow.next, fast.next.next];
  } while (slow !== fast);
  slow = head; // phase 2: from the head and from the meeting point
  while (slow !== fast) [slow, fast] = [slow.next, fast.next];
  return slow;
}`,
    say: "Floyd's algorithm: slow moves one step, fast two. If they meet there's a cycle; restart one at the head, step both by one, and they meet at the entry. O(n) time, O(1) space.",
    source: "/dsa/patterns/fast-slow-pointers#the-core-idea-a-faster-runner-laps-a-slower-one",
  },
  {
    id: "linked-list-reversal-pattern",
    track: "DSA",
    topic: "List reversal",
    title: "Save the next link before you cut it",
    hook: "Linked list problems are solved by rewiring next pointers in O(1) space, and one overwritten link loses the rest of the list.",
    points: [
      "Spot it: **reverse** all or part of a list, **merge** or reorder lists in place, or remove nodes where the head may go.",
      "Spot it: pair the front of a list with its **back read backwards** (reorder, palindrome check) in O(1) memory.",
      "Every step runs in one order: **save** the link you still need, overwrite the pointer, then **advance**.",
      "A **dummy node** in front of the head gives every real node a predecessor, so the head stops being a special case.",
    ],
    more: [
      {
        title: "Templates",
        points: [
          "Reverse a sublist after `before`, then fix two links: **`before.next = prev`** and **`first.next = curr`**.",
          "Reorder or palindrome: find the middle, **cut** there, reverse the back half, then walk both halves together.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time and **O(1)** extra space to reverse, splice or weave. Recursive reversal costs O(n) stack."],
      },
      {
        title: "Watch out",
        points: [
          "Returning `head` after it moved: return **`prev`** after a reversal and **`dummy.next`** after a dummy edit.",
          "Not cutting before reversing the back half leaves a **cycle** in the result.",
          "Reading `node.next.next` without checking `node.next` **throws** on lists of length 0, 1 or 2.",
        ],
      },
    ],
    code: `function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next; // 1. save the rest
    curr.next = prev;       // 2. flip the arrow
    prev = curr;            // 3. advance both pointers
    curr = next;
  }
  return prev; // the old tail is the new head
}`,
    say: "I'd walk prev, curr and next: save curr.next, point curr back at prev, then advance. O(n) time, O(1) space, and a dummy head whenever the head itself can change.",
    source: "/dsa/patterns/linked-list-reversal#the-core-idea-save-the-link-before-you-cut-it",
  },
  {
    id: "tree-dfs-pattern",
    track: "DSA",
    topic: "Tree DFS",
    title: "Solve both subtrees, then combine the answers at the node",
    hook: "Most binary tree problems are one recursive function: trust the calls on the children and write only the base case and the combine step.",
    points: [
      "Spot it: a **binary tree or BST** whose answer depends on whole subtrees: height, size, balance, root-to-leaf paths.",
      "Write `f(node)` for one subtree: a **base case** for `null` and a **combine step** from the left and right answers.",
      "Answers flow **up** as return values (heights, sums) or **down** as parameters (running sums, BST bounds).",
      "Paths that **bend** (diameter, max path sum): record left arm + right arm in an outer `best`, return only the longer arm.",
    ],
    more: [
      {
        title: "BST and depth",
        points: [
          "Validate a BST by carrying **`(low, high)`** down: a node can suit its parent yet break a bound set higher up.",
          "V8 holds **roughly 10,000 frames**. A skewed tree of 10^5 nodes needs an explicit stack instead of recursion.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time, **O(h)** stack: O(log n) when balanced, O(n) when skewed. Recomputing heights at every node is O(n²)."],
      },
      {
        title: "Watch out",
        points: [
          "A node with one child is **not a leaf**: a leaf has both children null.",
          "Starting a maximum at `0` when values can be negative: use **`-Infinity`**.",
          "Pushing the shared `path` array into the results instead of a **copy**.",
        ],
      },
    ],
    code: `function isBalanced(root) {
  const check = (node) => { // height, or -1 if unbalanced below
    if (node === null) return 0;
    const left = check(node.left), right = check(node.right);
    if (left === -1 || right === -1) return -1;
    if (Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right); // combine on the way up
  };
  return check(root) !== -1;
}`,
    say: "I'd write a function that answers the question for one subtree, trust the recursive calls on both children, and combine at the node. Each node is visited once: O(n) time, O(h) stack.",
    source: "/dsa/patterns/tree-dfs#the-core-idea-trust-the-recursive-call",
  },
  {
    id: "tree-bfs-pattern",
    track: "DSA",
    topic: "Tree BFS",
    title: "A queue reads a tree row by row, shallowest first",
    hook: "Level averages, side views and minimum depth are all the same BFS loop with a different line of per-level work.",
    points: [
      "Spot it: the answer is **per level** or per row, or what is visible **from one side** of the tree.",
      "Spot it: the **nearest** or shallowest something, such as the minimum depth or the closest leaf.",
      "Children join the queue **behind** every node still waiting on the current level, so nodes come out in depth order.",
      "When a level starts, the queue holds exactly that level: **snapshot its size**, dequeue that many, and the rest is the next level.",
    ],
    more: [
      {
        title: "Variants",
        points: [
          "**Right side view**: keep the node at `i === size - 1`. **Zigzag**: write values at `size - 1 - i` on alternate levels.",
          "**Minimum depth**: return at the first leaf you dequeue. Nothing later can be shallower.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(n)** time and **O(w)** space, where w is the widest level: up to about n / 2."],
      },
      {
        title: "Watch out",
        points: [
          "`queue.shift()` moves every element, so a big BFS becomes **O(n²)**. Use a head index.",
          "Looping on the live `queue.length` inside a level **merges** every level into one.",
          "Return `[]` for an empty tree, never `[[]]`, and **never enqueue** `null` children.",
        ],
      },
    ],
    code: `function rightSideView(root) {
  const view = [];
  let level = root ? [root] : []; // exactly one level at a time
  while (level.length) {
    view.push(level.at(-1).val); // the last node on this level
    level = level.flatMap((n) => [n.left, n.right]).filter(Boolean);
  }
  return view;
}`,
    say: "I'd BFS with a queue and snapshot its size at the start of each level, so I know exactly where a level ends. For minimum depth I return at the first leaf, since nothing later is shallower.",
    source: "/dsa/patterns/tree-bfs#the-core-idea-a-queue-keeps-the-levels-in-order",
  },
  {
    id: "trie-pattern",
    track: "DSA",
    topic: "Trie",
    title: "Prefix lookups in O(word length), however many words you store",
    hook: "A hash set can't answer \"does any word start with `ca`?\" without scanning every word, while a trie walks one edge per character.",
    points: [
      "Spot it: many **prefix** questions (startsWith, autocomplete, prefix counts), or **wildcards** like `.` for any letter.",
      "Spot it: a **dictionary of words** matched against a sentence or a grid, where dead paths should stop early.",
      "Every node **stands for a prefix**: the characters on its path from the root. Words that share a prefix share nodes.",
      "An **end-of-word flag** marks where an inserted word stops: after inserting \"cart\", only the flag says if \"car\" is a word.",
    ],
    more: [
      {
        title: "Template",
        points: [
          "Insert walks the same path, **creating** missing children, then sets `isEnd` on the last node.",
          "Wildcard `.`: turn the walk into a DFS that tries **every child** and returns true at the first match.",
          "Grid search: carry a trie node along the DFS and **abandon** a path when the next letter has no child.",
        ],
      },
      {
        title: "Complexity",
        points: ["Insert and lookup cost **O(L)** for a word of length L. Building from N words costs **O(S)** for S total characters."],
      },
      {
        title: "Watch out",
        points: [
          "`search` returning true because the path exists, **without checking** the end flag.",
          "An **array of 26** children breaks on uppercase, digits or other characters. A `Map` is the safe default.",
          "In wildcard DFS, `return dfs(child, i + 1)` inside the loop gives up after the **first child**.",
        ],
      },
    ],
    code: `// node = { children: Map<char, node>, isEnd: boolean }
function find(root, prefix) { // the node for prefix, or null
  let node = root;
  for (const ch of prefix) {
    node = node.children.get(ch); // one edge per character
    if (!node) return null;       // the path breaks off here
  }
  return node;
}
const search = (root, w) => find(root, w)?.isEnd === true;`,
    say: "A trie stores words along paths from the root, so search and startsWith are one O(L) walk whatever the dictionary size. I'd pick it over a Set only for prefixes, wildcards or early stopping.",
    source: "/dsa/patterns/trie#the-core-idea-a-prefix-is-a-path",
  },
  {
    id: "heaps-pattern",
    track: "DSA",
    topic: "Heaps",
    title: "Keep the k largest in a min-heap that never grows past k",
    hook: "A heap gives you the best item in O(1) and updates in O(log n), so top k costs O(n log k) instead of a full sort.",
    points: [
      "Spot it: \"the **k largest**, smallest, most frequent or closest\", or **merge k sorted** lists.",
      "Spot it: a **running** answer over a stream (the median so far), or \"always process the **cheapest** next\".",
      "A heap is a complete tree in an array where **every parent comes before its children**, so the best item sits at the root.",
      "For the k **largest**, keep a **min**-heap of size k: its root is the weakest of the top k, the one to evict.",
    ],
    more: [
      {
        title: "Variants",
        points: [
          "**K-way merge**: one head per sorted input in a min-heap; pop the smallest, push its successor.",
          "**Running median**: a max-heap for the lower half and a min-heap for the upper half, sizes equal or one apart.",
        ],
      },
      {
        title: "Complexity",
        points: ["`peek` **O(1)**, `push` and `pop` **O(log n)**. Top k of n: O(n log k). K-way merge of N items: O(N log k)."],
      },
      {
        title: "Watch out",
        points: [
          "**Wrong direction**: a max-heap of size k keeps the k smallest, not the largest.",
          "A comparator that returns a **boolean**, like `(a, b) => a > b`, breaks the heap. Return a number.",
          "Re-sorting an array after every insert costs O(n log n) **per operation**.",
        ],
      },
    ],
    code: `// Heap: the comparator heap class from Template 1
function kthLargest(nums, k) {
  const heap = new Heap((a, b) => a - b); // a MIN-heap
  for (const x of nums) {
    heap.push(x);
    if (heap.size() > k) heap.pop(); // evict the smallest
  }
  return heap.peek(); // the weakest of the top k
}`,
    say: "For the k largest I'd keep a min-heap capped at k: push each value and pop when it grows past k. The root is the kth largest. O(n log k) time, O(k) space, and it works on a stream.",
    source: "/dsa/patterns/heaps#template-2-top-k-with-a-heap-of-size-k",
  },
  {
    id: "graph-traversal-pattern",
    track: "DSA",
    topic: "Graph traversal",
    title: "BFS finds the fewest steps, DFS floods a region",
    hook: "Grids are graphs in disguise, and both searches visit every node once in O(V + E) if you mark each node when you push it.",
    points: [
      "Spot it: a **grid of cells**, or islands, regions and connected groups to count, measure or fill.",
      "Spot it: the **fewest steps** when every move costs the same, or something that **spreads** from several places at once.",
      "A **stack** continues from the newest node (depth-first); a **queue** finishes distance d before d + 1 (breadth-first).",
      "Mark a node visited **when you push it**: then nothing is queued twice, and BFS reaches each node first by a shortest path.",
    ],
    more: [
      {
        title: "Variants",
        points: [
          "Count regions: scan every cell, and each unmarked one starts a **new component**. Flood it before moving on.",
          "**Multi-source BFS**: queue every source at distance 0 and run once. Each cell is reached from its nearest source.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(V + E)** on an adjacency list, **O(m · n)** on an m × n grid, however many sources you start from."],
      },
      {
        title: "Watch out",
        points: [
          "`new Array(rows).fill(new Array(cols))` makes every row the **same array**. Build rows with `Array.from`.",
          "Recursive DFS on a big grid **overflows** the stack at around ten thousand nested calls. Use a stack array or BFS.",
          "`queue.shift()` is O(n) per call. Walk a **head index** instead.",
        ],
      },
    ],
    code: `function bfs(adj, start) { // edges from start, -1 = unreachable
  const dist = new Array(adj.length).fill(-1), queue = [start];
  dist[start] = 0; // mark when queued, never when popped
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head]; // head index: no O(n) shift()
    for (const v of adj[u])
      if (dist[v] === -1) { dist[v] = dist[u] + 1; queue.push(v); }
  }
  return dist;
}`,
    say: "For fewest steps with equal-cost moves I'd use BFS with a head-index queue, marking nodes when I push them so each is queued once at its shortest distance. That's O(V + E).",
    source: "/dsa/patterns/graph-traversal#the-core-idea-visit-every-node-once",
  },
  {
    id: "topological-sort-pattern",
    track: "DSA",
    topic: "Topological sort",
    title: "Order tasks by repeatedly taking one with no prerequisites",
    hook: "Course schedules and build orders are directed graphs, and Kahn's algorithm orders them in O(V + E) while detecting cycles for free.",
    points: [
      "Spot it: **prerequisites** or dependencies, \"must happen before\", or \"is it **possible to finish**?\"",
      "Spot it: the minimum number of **rounds or semesters** when independent tasks can run in parallel.",
      "A graph without a cycle always has a node with **no incoming edges**. Place it, remove its edges, repeat.",
      "Kahn's algorithm tracks each node's **in-degree** and queues the ones at 0. Fewer than V placed means a **cycle**.",
    ],
    more: [
      {
        title: "DFS version",
        points: [
          "List nodes as they **finish**, then reverse. An edge into a **gray** node (still on the current path) is a cycle.",
          "Process Kahn's queue in **rounds**: the number of rounds is the minimum number of stages.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(V + E)** time and space, for Kahn's and for DFS: each node is queued once and each edge used once."],
      },
      {
        title: "Watch out",
        points: [
          "**Edge direction**: in Course Schedule, `[a, b]` means b before a, so the edge is `b → a`.",
          "A plain visited set can't find cycles in a **directed** graph: reaching a finished node isn't a cycle.",
          "Nodes without edges still need a place in the order and **count towards V**.",
        ],
      },
    ],
    code: `function topoSort(n, edges) { // [from, to]: from comes first
  const adj = Array.from({ length: n }, () => []);
  const deg = new Array(n).fill(0); // in-degree of each node
  for (const [from, to] of edges) { adj[from].push(to); deg[to]++; }
  const order = []; // doubles as the queue
  for (let v = 0; v < n; v++) if (deg[v] === 0) order.push(v);
  for (let i = 0; i < order.length; i++) // order[i] is placed
    for (const v of adj[order[i]]) if (--deg[v] === 0) order.push(v);
  return order.length === n ? order : []; // short means a cycle
}`,
    say: "I'd use Kahn's algorithm: count in-degrees, queue every node at zero, and release successors as I place nodes. If fewer than n get placed, the rest sit on or behind a cycle.",
    source: "/dsa/patterns/topological-sort#template-1-kahns-algorithm",
  },
  {
    id: "union-find-pattern",
    track: "DSA",
    topic: "Union-find",
    title: "Same group? Compare roots, in near-constant time",
    hook: "When links arrive one at a time, union-find answers \"are these connected?\" without re-running a graph search after every edge.",
    points: [
      "Spot it: count **groups** (provinces, components), or links that **arrive one at a time**.",
      "Spot it: \"does this edge **create a cycle**?\" in an undirected graph, or items **equivalent** through chains of links.",
      "Each group is a tree whose **root names the group**. `find` climbs to the root; `union` hangs one root under the other.",
      "**Path compression** and **union by rank** keep the trees almost flat, so both operations are effectively O(1).",
    ],
    more: [
      {
        title: "Template",
        points: [
          "`union` returns **false** when both ends already share a root: in a graph, that edge closes a cycle.",
          "Union by rank: hang the **shorter tree** under the taller, so no tree grows taller than log₂ n.",
          "Count groups: start at n and subtract one for **every union that merges**.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(α(n))** amortised per operation with both tricks, effectively constant. With neither, trees become O(n) chains."],
      },
      {
        title: "Watch out",
        points: [
          "Comparing `parent[a] === parent[b]` instead of **`find(a) === find(b)`**: a parent is not always a root.",
          "Linking the items instead of their **roots** leaves the rest of the old tree behind.",
          "A recursive `find` on a long chain **overflows** the stack. The loop version never recurses.",
        ],
      },
    ],
    code: `const parent = Array.from({ length: n }, (_, i) => i); // all roots
function find(x) { // path halving: point x at its grandparent
  while (parent[x] !== x) x = parent[x] = parent[parent[x]];
  return x;
}
function union(a, b) { // false: already in one group (cycle edge)
  const ra = find(a), rb = find(b);
  if (ra !== rb) parent[rb] = ra; // link the roots, never the items
  return ra !== rb;
}`,
    say: "I'd use union-find: each group is a tree named by its root, union links two roots, and a union whose ends already share a root means the edge closes a cycle. Near-constant time per edge.",
    source: "/dsa/patterns/union-find#the-core-idea-one-root-per-group",
  },
  {
    id: "shortest-paths-pattern",
    track: "DSA",
    topic: "Shortest paths",
    title: "Let the edge weights pick the shortest-path algorithm",
    hook: "BFS, Dijkstra and Bellman-Ford all repeat one move, relaxing an edge, and the edge weights decide which order of relaxing is correct.",
    points: [
      "Spot it: the **minimum** cost, time or effort, with **weighted** edges, or \"using at most k stops\".",
      "Relax `u → v` with weight w: if `dist[u] + w < dist[v]`, a **cheaper route** to v goes through u.",
      "Equal weights: **BFS**. Non-negative weights: **Dijkstra** with a min-heap. Negative weights or an edge limit: Bellman-Ford.",
      "Dijkstra always expands the closest unsettled node, so a distance is **final when popped**, not when pushed.",
    ],
    more: [
      {
        title: "In JavaScript",
        points: [
          "No decrease-key: push a new `[dist, node]` on every improvement and **skip stale entries** where `d > dist[u]`.",
          "At most k stops: run **k + 1 rounds** of Bellman-Ford, each reading the previous round's distances.",
        ],
      },
      {
        title: "Complexity",
        points: ["BFS **O(V + E)**. Dijkstra with a binary heap **O(E log V)**. Bellman-Ford O(V · E), or O(k · E) for k + 1 rounds."],
      },
      {
        title: "Watch out",
        points: [
          "**Negative edges** break Dijkstra: with A→B 4, A→C 5 and C→B -3, it settles B at 4 though 2 exists.",
          "Returning when the target is **pushed** instead of popped.",
          "Relaxing **in place** in Bellman-Ford chains several edges in one round and breaks an edge limit.",
        ],
      },
    ],
    code: `function bellmanFord(n, edges, src, maxEdges = n - 1) {
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  for (let round = 1; round <= maxEdges; round++) {
    const old = dist.slice(); // read last round, write this round
    for (const [u, v, w] of edges)
      if (old[u] + w < dist[v]) dist[v] = old[u] + w;
  }
  return dist; // cheapest paths using at most maxEdges edges
}`,
    say: "Equal weights: BFS. Non-negative weights: Dijkstra with a min-heap, skipping stale entries. Negative weights or at most k stops: Bellman-Ford, with each round reading the previous round's distances.",
    source: "/dsa/patterns/shortest-paths#the-core-idea-relax-closest-first",
  },
  {
    id: "backtracking-pattern",
    track: "DSA",
    topic: "Backtracking",
    title: "Choose, explore, un-choose: one path walks the whole tree",
    hook: "Subsets, permutations and puzzles share one template, and the craft is producing each answer exactly once while pruning dead branches early.",
    points: [
      "Spot it: \"return **all** subsets, combinations or permutations\", or \"generate every valid\" board or string.",
      "Spot it: **small limits** like n ≤ 10 or a 6 × 6 board, where an exponential search is expected.",
      "**Choose** an option, explore recursively, then **un-choose** it, so one shared `path` serves the whole search.",
      "Avoid duplicates by construction: a **start index** when order doesn't matter, a **`used[]`** array when it does.",
    ],
    more: [
      {
        title: "Pruning",
        points: [
          "Ask \"can this branch still succeed?\" **before** recursing, not on finished answers.",
          "Sort the input first, so one failed check lets you **`break`** instead of `continue`.",
        ],
      },
      {
        title: "Complexity",
        points: ["Exponential: nodes × work per node. Subsets **O(n · 2^n)**, permutations **`O(n · n!)`**, including the copies."],
      },
      {
        title: "Watch out",
        points: [
          "`result.push(path)` stores the live array, which is **empty** by the end. Push `[...path]`.",
          "Forgetting to undo **every** change: the `pop()`, `used[i] = false`, the restored grid cell.",
          "Recursing with `start + 1` instead of **`i + 1`** creates duplicate combinations.",
        ],
      },
    ],
    code: `function subsets(nums, start = 0, path = [], result = []) {
  result.push([...path]); // record a COPY at every node
  for (let i = start; i < nums.length; i++) {
    path.push(nums[i]);                 // choose
    subsets(nums, i + 1, path, result); // explore items after i
    path.pop();                         // un-choose
  }
  return result;
}`,
    say: "Each call chooses an option, recurses, then undoes the choice, so one path array serves the whole search. A start index stops duplicate combinations, and I prune before recursing.",
    source: "/dsa/patterns/backtracking#the-core-idea-one-path-walked-forward-and-back",
  },
  {
    id: "greedy-pattern",
    track: "DSA",
    topic: "Greedy",
    title: "Take the best choice now, but only if you can prove it",
    hook: "Greedy is usually a sort plus one pass in O(n log n), and it is only correct when the local choice provably never hurts.",
    points: [
      "Spot it: \"maximum or minimum number of…\" with a natural **rule of thumb**: earliest end, cheapest so far, furthest reach.",
      "Spot it: scheduling or assignment where **sorting first** puts the obvious candidate in front, with n up to 10^5 or more.",
      "**Exchange argument**: swap the greedy choice into any optimal answer and show it stays valid and no worse.",
      "**Greedy stays ahead**: after every step, the greedy partial answer is at least as good as any other.",
    ],
    more: [
      {
        title: "Common rules",
        points: [
          "Keep the most non-overlapping intervals: sort by **earliest end**, not by start or length.",
          "Jump Game: keep the **furthest reachable** index. An index beyond it is a gap nothing can cross.",
        ],
      },
      {
        title: "Complexity",
        points: ["Sort then one pass: **O(n log n)**. One pass with a running best: **O(n)** time and O(1) space."],
      },
      {
        title: "Watch out",
        points: [
          "Coins `4, 3, 1` for amount 6: greedy takes 4 + 1 + 1, but **3 + 3** needs two. A counterexample means **DP**.",
          "Ties: `start > lastEnd` instead of **`>=`** rejects intervals that only touch.",
          "`sort` works **in place**: copy with `[...arr]` or use `toSorted` if the order matters later.",
        ],
      },
    ],
    code: `function maxNonOverlapping(intervals) { // [start, end)
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let kept = 0, lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) { kept++; lastEnd = end; } // fits: keep it
  }
  return kept; // fewest removals = intervals.length - kept
}`,
    say: "My rule is earliest end first, and I'd justify it with stays ahead: after k picks, my kth interval ends no later than anyone's. I'd also try a tiny counterexample before trusting it.",
    source: "/dsa/patterns/greedy#the-core-idea-a-choice-you-never-regret",
  },
  {
    id: "dp-1d-pattern",
    track: "DSA",
    topic: "DP 1D",
    title: "Say what dp[i] means, then build it from smaller indices",
    hook: "Dynamic programming is recursion that never solves the same subproblem twice, which turns an exponential brute force into states × choices.",
    points: [
      "Spot it: the **number of ways**, the **minimum or maximum** cost, or \"is it possible?\" over a series of choices.",
      "Spot it: your brute-force recursion calls itself with the **same arguments** again and again.",
      "Write the state in words: `dp[i]` = the cheapest cost to stand on step i. Most wrong DPs start with a **vague sentence**.",
      "Build `dp[i]` from the **last decision**: the last move came from i - 1 or i - 2, the last coin was one of the coins.",
    ],
    more: [
      {
        title: "Recipe",
        points: [
          "Base cases: counting starts at **`dp[0] = 1`**; minimums use **`Infinity`** for states that can't be reached.",
          "Fill cells in an order where everything a cell reads is **already computed**. Top-down with a memo finds that order for you.",
          "If a cell reads only the last one or two, keep **two variables**: O(n) space becomes O(1).",
        ],
      },
      {
        title: "Complexity",
        points: ["**States × work per state**. Two-branch recursion is O(2^n); memoised or bottom-up it is **O(n)**."],
      },
      {
        title: "Watch out",
        points: [
          "`if (memo.get(i))` treats a cached **0** as missing: use `memo.has(i)`.",
          "Sizing the table n instead of **n + 1**, then reading the answer from the wrong cell.",
          "Returning **`Infinity`** to the caller instead of the `-1` the problem asks for.",
        ],
      },
    ],
    code: `function minCostClimbing(cost) {
  const n = cost.length;
  const dp = new Array(n + 1).fill(0); // dp[0] = dp[1] = 0
  for (let i = 2; i <= n; i++) { // dp[i]: cheapest way onto step i
    const fromOne = dp[i - 1] + cost[i - 1];
    const fromTwo = dp[i - 2] + cost[i - 2];
    dp[i] = Math.min(fromOne, fromTwo); // the last move decides
  }
  return dp[n]; // the top is one past the last step
}`,
    say: "I'd say the state out loud: dp[i] is the cheapest cost to stand on step i. The last move came from i - 1 or i - 2, so take the min, fill upwards, and roll two variables for O(1) space.",
    source: "/dsa/patterns/dp-1d#step-by-step-the-dp-recipe",
  },
  {
    id: "dp-2d-pattern",
    track: "DSA",
    topic: "DP 2D",
    title: "Two strings, a grid or a budget: give the table a second index",
    hook: "When one index can't describe a subproblem, `dp[i][j]` can, with the same recipe as 1D and O(m × n) time.",
    points: [
      "Spot it: **two strings** compared (common subsequence, edit distance), or **grid paths** moving only right and down.",
      "Spot it: **items under a budget**, picking a subset whose weights fit a capacity or hit an exact sum.",
      "Two strings: `dp[i][j]` covers the first i letters of `a` and the first j of `b`, so the table is **(m + 1) × (n + 1)**.",
      "Row 0 and column 0 are the **empty prefix**, the base cases. Cell `(i, j)` reads the letters `a[i - 1]` and `b[j - 1]`.",
    ],
    more: [
      {
        title: "Knapsack in one row",
        points: [
          "**0/1**, each item once: loop capacity from **high to low**, so `dp[c - w]` still means \"without this item\".",
          "Unbounded: loop **low to high**. Counting combinations: **coins outside**, amounts inside.",
        ],
      },
      {
        title: "Complexity",
        points: ["**O(m × n)** time. Space O(m × n), or one row, but then you can't **rebuild** the answer by walking back."],
      },
      {
        title: "Watch out",
        points: [
          "`new Array(m).fill(new Array(n).fill(0))` shares **one row**: build rows with `Array.from`.",
          "Seeding row 0 of edit distance with zeros instead of **0, 1, 2, …, n**.",
          "Compressing 0/1 knapsack with the capacity loop going **up**: items get reused.",
        ],
      },
    ],
    code: `function lcs(a, b) { // length of the longest common subsequence
  const dp = Array.from({ length: a.length + 1 },
    () => new Array(b.length + 1).fill(0)); // row 0, col 0: empty
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1 // both last letters are used
        : Math.max(dp[i - 1][j], dp[i][j - 1]); // drop one
  return dp[a.length][b.length];
}`,
    say: "I'd define dp[i][j] over the first i letters of a and the first j of b, pad an empty row and column as base cases, and fill row by row. O(m × n) time, and one row if I only need the length.",
    source: "/dsa/patterns/dp-2d#the-core-idea-a-cell-its-neighbours-and-a-fill-order",
  },
  {
    id: "bit-manipulation-pattern",
    track: "DSA",
    topic: "Bits",
    title: "XOR cancels pairs, and n & (n - 1) drops the lowest set bit",
    hook: "Three bit tricks solve most interview questions in O(1) space, as long as you remember JavaScript's 32-bit rule.",
    points: [
      "Spot it: \"every element appears **twice except one**\", or a number **missing** from a range, in O(1) space.",
      "Spot it: **count set bits**, test for a power of two, or list every subset of a small set (n up to about 20).",
      "`x ^ x` is 0 and `x ^ 0` is x, so XOR-ing a whole list **cancels every pair** and leaves the unpaired value.",
      "`n & (n - 1)` clears the **lowest set bit**, so a loop runs once per set bit. `1 << i` is the **mask** for bit i.",
    ],
    more: [
      {
        title: "Masks",
        points: [
          "Test `(n >> i) & 1`, set `n | (1 << i)`, clear `n & ~(1 << i)`, toggle `n ^ (1 << i)`.",
          "**Subsets**: count `mask` from 0 to `(1 << n) - 1`; bit i says whether item i is in.",
          "Power of two: `n > 0 && (n & (n - 1)) === 0`, because it has **exactly one** set bit.",
        ],
      },
      {
        title: "Complexity",
        points: ["Each operator is **O(1)**. XOR over n values: O(n) time, O(1) space. All subsets: **O(n · 2^n)**."],
      },
      {
        title: "Watch out",
        points: [
          "Operators work on **signed 32-bit** integers: `1 << 31` is negative. Finish with `>>> 0` for unsigned results.",
          "`n & 1 === 0` parses as `n & (1 === 0)`. **Parenthesise**: `(n & 1) === 0`.",
          "Use **`>>>`**, not `>>`, on unsigned input of 2^31 or more.",
        ],
      },
    ],
    code: `function singleNumber(nums) { // every other value appears twice
  let acc = 0;
  for (const x of nums) acc ^= x; // pairs cancel: x ^ x === 0
  return acc;
}
function popcount(n) { // one iteration per set bit
  let count = 0;
  while (n !== 0) { n &= n - 1; count++; } // drop the lowest set bit
  return count;
}`,
    say: "XOR everything: pairs cancel and the single value is left, O(n) time and O(1) space. In JavaScript I'd keep the 32-bit rule in mind and finish with >>> 0 if bit 31 can be set.",
    source: "/dsa/patterns/bit-manipulation#the-core-idea-one-operator-every-bit-at-once",
  },

  {
    id: "design-data-structures-pattern",
    track: "DSA",
    topic: "Design",
    title: "Pair a structure that finds with one that orders",
    hook: "Design questions give you a class and an O(1) budget per method. No single structure meets it, so you glue two together.",
    points: [
      "Spot it: \"design a class\", every method in **O(1)**, \"evict the least recently used\", or \"the value at time t\".",
      "A **hash map** finds a key in O(1) but has no order. A **list** keeps order but needs a scan to find anything.",
      "Pair them: the map points at a **list node**, so a hit unlinks and moves the node to the front in O(1).",
      "Name what each method needs and which structure makes it O(1). A method with no answer needs one more structure.",
    ],
    more: [
      {
        title: "The classics",
        points: [
          "**LRU**: map + doubly linked list. **LFU**: map + one bucket of keys per use count, plus `minCount`.",
          "**Time-based store**: per-key sorted history, then binary search for the last write at or before t.",
          "**Random member**: array + map of positions. Remove by copying the **last element** into the hole, then `pop`.",
          "**Min stack**: store the minimum so far with each pushed value, so `pop` needs no repair.",
        ],
      },
      {
        title: "Complexity",
        points: ["LRU and LFU **get/put in O(1)**, space O(capacity). Time-based `get` is **O(log m)** for m writes of that key."],
      },
      {
        title: "Watch out",
        points: [
          "A `put` on an existing key is also a **use**: refresh it, do not just overwrite.",
          "Evicting from the list but not the map (or the reverse) leaves them disagreeing.",
          "After swap-and-pop, update the **moved** element's index, or the next removal breaks.",
        ],
      },
    ],
    code: `class LRU { // map: key -> node, list: newest first
  get(key) {
    const n = this.map.get(key);
    if (!n) return -1;
    this.unlink(n); this.pushFront(n); // a read is a use
    return n.val;
  }
}`,
    say: "I'd pair a hash map with a doubly linked list: the map finds the node, the list keeps order, and a hit moves the node to the front, so get and put are both O(1).",
    source: "/dsa/patterns/design-data-structures#the-core-idea-pair-a-structure-that-finds-with-one-that-orders",
  },
  {
    id: "matrix-pattern",
    track: "DSA",
    topic: "Matrix",
    title: "A grid is coordinates: rotate, spiral, mark in place",
    hook: "Most grid problems are index arithmetic with a thin-grid edge case, and many can be done in O(1) extra space.",
    points: [
      "Spot it: **rotate or transpose**, spiral or diagonal order, \"in place\", or every cell changes **at the same time**.",
      "A clockwise turn sends `(i, j)` to `(j, n - 1 - i)`: **transpose**, then **reverse each row**, all in place.",
      "A spiral is four walls (`top`, `bottom`, `left`, `right`) that move inward after each side is read.",
      "Write the coordinate rule for one cell first, test it on a 2 by 2 grid, then loop it.",
    ],
    more: [
      {
        title: "Tricks",
        points: [
          "**Set zeroes**: use the first row and column as flags, plus two booleans for whether they held a zero.",
          "**Game of Life**: encode 2 = alive then dead, 3 = dead then alive, so cells still see the old grid.",
          "**Sorted grid**: position `p` is row `Math.floor(p / cols)`, column `p % cols`. Diagonals share `r + c`.",
        ],
      },
      {
        title: "Complexity",
        points: ["Rotate, spiral, zeroes and life are **O(rows × columns)** time. In-place versions use **O(1)** extra space."],
      },
      {
        title: "Watch out",
        points: [
          "`new Array(rows).fill(new Array(cols))` shares **one row**. Use `Array.from`.",
          "Transposing with `j` from 0 swaps every pair twice. Start at `j = i + 1`.",
          "Spiral without `top <= bottom` and `left <= right` checks reads a single row twice.",
        ],
      },
    ],
    code: `function rotate(m) { // 90 degrees clockwise, in place
  const n = m.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
  for (const row of m) row.reverse();
}`,
    say: "To rotate a square grid in place I transpose it, swapping each pair above the diagonal once, then reverse every row. That is O(n squared) time and O(1) space.",
    source: "/dsa/patterns/matrix#the-core-idea-a-grid-is-a-set-of-coordinates",
  },

  // ─── JavaScript cheat sheet, in cheat-sheet order ──────────────────────────
  {
    id: "js-falsy-zero",
    track: "JavaScript",
    topic: "Truthiness",
    title: "Index 0 is a real answer, and it is falsy",
    hook: "Many wrong answers in JavaScript aren't algorithm bugs but a 0 read as \"not found\", or a fallback that throws away a real 0.",
    points: [
      "Exactly eight values are **falsy**: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined` and `NaN`. `[]` and `'0'` are truthy.",
      "`if (idx)` after `indexOf` skips index 0. Compare with **`idx !== -1`**, or use `includes` for a yes or no.",
      "`if (map.get(k))` is false when the stored count or index is `0`. Ask **`map.has(k)`**.",
      "`count || 1` throws away a real `0`. **`count ?? 1`** only falls back on `null` or `undefined`.",
    ],
    more: [
      {
        title: "Equality",
        points: [
          "Always use **`===`**: `==` converts types, so `0 == ''` is true. The one useful exception is `x == null`.",
          "`typeof null` and `typeof []` are both `'object'`. Test **`x === null`** and **`Array.isArray(x)`**.",
        ],
      },
      {
        title: "References",
        points: [
          "Arrays, objects, Maps and Sets are **references**: `res.push(path)` stores the live array. Push `[...path]`.",
          "`nums = nums.filter(…)` only rebinds your local name. To change the input **in place**, write into `nums[i]`.",
        ],
      },
    ],
    code: `const nums = [7, 3, 9];
const i = nums.indexOf(7);          // 0: found at index 0
if (i) console.log("never runs");   // 0 is falsy
if (i !== -1) console.log("found"); // test what you mean

const count = new Map([["a", 0]]);
console.log(count.get("a") || 5);   // 5: the real 0 is lost
console.log(count.get("a") ?? 5);   // 0: ?? skips null/undefined only
console.log(count.has("a"));        // true`,
    source: "/dsa/js#variables-types",
  },
  {
    id: "js-integer-division-modulo",
    track: "JavaScript",
    topic: "Numbers",
    title: "There is no integer division, and -7 % 3 is -1",
    hook: "Midpoints, ring buffers and hash buckets need integer maths, and JavaScript gives you floats and a signed remainder instead.",
    points: [
      "`a / b` always returns a float: `7 / 2` is `3.5`. Pick the rounding: **`Math.floor`** rounds down, **`Math.trunc`** toward zero.",
      "They differ on negatives: `Math.floor(-7 / 2)` is `-4`, `Math.trunc(-7 / 2)` is `-3`. **Round toward zero** means trunc.",
      "`%` is a **remainder**, not a modulo: `-7 % 3` is `-1`. Use **`((a % m) + m) % m`** for indices and buckets.",
      "Test odd numbers with **`x % 2 !== 0`**: `-3 % 2` is `-1`, so `=== 1` misses negatives.",
    ],
    more: [
      {
        title: "32-bit shortcuts",
        points: [
          "`x | 0`, `~~x` and `>> 1` truncate too, but **wrap around** above 2^31 − 1: `3e9 | 0` is negative.",
          "For a midpoint over a big answer range, use **`Math.floor((lo + hi) / 2)`**, not `(lo + hi) >> 1`.",
        ],
      },
      {
        title: "Ceiling division",
        points: ["Groups of k for n items: **`Math.ceil(n / k)`**, or `Math.floor((n + k - 1) / k)` in integers."],
      },
    ],
    code: `console.log(7 / 2, Math.floor(7 / 2));              // 3.5 3
console.log(Math.floor(-7 / 2), Math.trunc(-7 / 2)); // -4 -3
console.log(-7 % 3);                                // -1, not 2
const mod = (a, m) => ((a % m) + m) % m;
console.log(mod(-7, 3));                            // 2
const ring = ["a", "b", "c", "d", "e"];
console.log(ring[mod(0 - 1, ring.length)]);         // "e"
console.log(3e9 | 0);                               // -1294967296`,
    source: "/dsa/js#numbers-math",
  },
  {
    id: "js-safe-integers-bigint",
    track: "JavaScript",
    topic: "Numbers",
    title: "Past 2^53 a product loses digits without any error",
    hook: "Sums of interview-sized values stay exact, but a product of two values near 10^9 does not, so `(a * b) % MOD` quietly goes wrong.",
    points: [
      "JavaScript has one `number` type: a 64-bit float that holds integers exactly up to **2^53**, about 9 × 10^15.",
      "Sums are rarely a problem: 10^5 values up to 10^9 add up to 10^14. **Products** are: two values near 10^9 make 10^18.",
      "For \"modulo 1e9 + 7\", **reduce after every addition** so values stay small and exact.",
      "For `(a * b) % MOD`, multiply as **`BigInt`**, take the remainder, and convert back.",
    ],
    more: [
      {
        title: "BigInt rules",
        points: [
          "BigInt is exact at any size but **slower**, can't be mixed with numbers in arithmetic, and doesn't work with `Math.*`.",
          "Factorials past `18!`, Fibonacci past F(78) and `2 ** n` past n = 53 **lose precision** the same way.",
        ],
      },
      {
        title: "Sentinels",
        points: [
          "**`Infinity`** is the natural start for a running minimum and for unreached DP cells: `Infinity + 5` is still `Infinity`.",
          "Convert on the way out: `best === Infinity ? -1 : best`.",
        ],
      },
    ],
    code: `const MOD = 1_000_000_007;
const mulMod = (x, y) =>
  Number((BigInt(x) * BigInt(y)) % BigInt(MOD));
const a = 999_999_999;
console.log((a * a) % MOD); // wrong: a * a is past 2^53
console.log(mulMod(a, a));  // exact
let ways = 1; // reduce after every step so values stay small
for (let i = 0; i < 100; i++) ways = (ways * 2) % MOD;
console.log(ways); // 976371285, which is 2^100 mod 1e9 + 7`,
    source: "/dsa/js#numbers-math",
  },
  {
    id: "js-string-building",
    track: "JavaScript",
    topic: "Strings",
    title: "Strings are immutable, so build them in an array and join once",
    hook: "Every string \"change\" makes a new string, and knowing what copies is what keeps a character loop O(n) instead of O(n²).",
    points: [
      "`s[i] = 'x'` never changes a string: strict mode throws, sloppy mode **silently ignores** it. Edit a character array.",
      "`result += ch` copies in principle. Engines often optimise plain appends, but you **can't rely on it** for Big-O.",
      "The idiom that is linear in every engine: **push pieces into an array** and call `join('')` once at the end.",
      "`slice`, `includes` and `indexOf` are **O(n)**: calling them in a loop over the same string is a hidden nested loop.",
    ],
    more: [
      {
        title: "Characters",
        points: [
          "`s.charCodeAt(i) - 97` maps `a` to `z` onto 0 to 25: an **array of 26** counters beats a `Map` for lowercase letters.",
          "`[...s]` and `for...of` split by character; prefer **`slice`** over `substring` and the deprecated `substr`.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Strings compare by code unit: `'Z' < 'a'` and **`'10' < '9'`**. Use `localeCompare` for dictionary order.",
          "`'7' + 1` is **`'71'`**. Convert digits with `Number(ch)`.",
          "`s.split(' ')` on repeated spaces gives empty strings: use **`s.trim().split(/\\s+/)`**.",
        ],
      },
    ],
    code: `function removeAdjacentPairs(s) { // "abbaca" -> "ca"
  const stack = []; // an array of characters, joined once
  for (const ch of s) {
    if (stack.at(-1) === ch) stack.pop();
    else stack.push(ch);
  }
  return stack.join("");
}
const chars = [..."stressed"]; // edit an array, not the string
console.log(chars.reverse().join("")); // "desserts"`,
    source: "/dsa/js#strings",
  },
  {
    id: "js-2d-array-shared-rows",
    track: "JavaScript",
    topic: "Arrays",
    title: "Array(n).fill([]) puts one shared row in every slot",
    hook: "Writing `grid[0][0]` then changes every row, one of the most common bugs in DP tables, grids and adjacency lists.",
    points: [
      "`fill(value)` evaluates `value` **once** and stores it in every slot. When it is an array, every row is **one object**.",
      "So `new Array(m).fill(new Array(n).fill(0))` and `new Array(n).fill([])` both share a **single inner array**.",
      "**`Array.from({ length: m }, () => …)`** calls the factory once per slot, so each row is its own array.",
      "`new Array(n)` alone makes **holes** that `map` skips: `new Array(n).map(…)` does nothing useful. `fill` first.",
    ],
    more: [
      {
        title: "Copies are shallow",
        points: [
          "`[...grid]` copies only the outer array. Copy a grid **row by row**: `grid.map((row) => [...row])`.",
          "`slice` copies a range; **`splice` mutates** in place and returns what it removed.",
        ],
      },
      {
        title: "Ends and costs",
        points: [
          "`push`, `pop` and `at(-1)` are **O(1)**; `shift` and `unshift` move every element: **O(n)**.",
          "`arr[-1]` is `undefined`, a property named \"-1\". Use **`arr.at(-1)`**.",
        ],
      },
    ],
    code: `const bad = new Array(3).fill(new Array(2).fill(0));
bad[0][0] = 1;
console.log(bad); // [[1, 0], [1, 0], [1, 0]]: one shared row

const grid = Array.from({ length: 3 }, () => new Array(2).fill(0));
grid[0][0] = 1;
console.log(grid); // [[1, 0], [0, 0], [0, 0]]

const adj = Array.from({ length: 4 }, () => []); // 4 separate lists`,
    source: "/dsa/js#arrays",
  },
  {
    id: "js-sort-comparator",
    track: "JavaScript",
    topic: "Sorting",
    title: "sort() without a comparator sorts numbers as strings",
    hook: "It passes the sample tests with single digits and fails the hidden ones the moment a 10 shows up.",
    points: [
      "The default `sort` compares elements as **strings**: `[10, 9, 1]` becomes `[1, 10, 9]`, and `-1` lands before `-5`.",
      "Always pass **`(a, b) => a - b`** for ascending, or `(a, b) => b - a` for descending.",
      "A comparator returns a **negative number** to put `a` first, positive for `b`, 0 for a tie. A boolean breaks it.",
      "Multi-key: **`a[0] - b[0] || a[1] - b[1]`**. A tie is 0, which is falsy, so `||` moves on to the next key.",
      "`sort` **mutates** and returns the same array. Use `toSorted` or `[...nums].sort(…)` to keep the input.",
    ],
    more: [
      {
        title: "Strings and stability",
        points: [
          "`a - b` on strings gives **NaN**, so nothing sorts. Use `localeCompare` or a three-way compare.",
          "Since ES2019 `sort` is **stable**: elements that compare equal keep their original order.",
        ],
      },
      {
        title: "Costs",
        points: [
          "**O(n log n)** comparisons. Compute expensive keys once, outside the comparator.",
          "Values from a small range (letters, ages, scores): **counting sort** in O(n + k).",
        ],
      },
    ],
    code: `console.log([10, 9, 1, 100, 25].sort()); // [1, 10, 100, 25, 9]
console.log([10, 9, 1].sort((a, b) => a - b)); // [1, 9, 10]

const intervals = [[5, 8], [1, 4], [1, 2]];
intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
console.log(intervals); // [[1, 2], [1, 4], [5, 8]]

const nums = [3, 1, 2];
const sorted = nums.toSorted((a, b) => a - b); // nums unchanged`,
    source: "/dsa/js#sorting",
  },
  {
    id: "js-map-vs-object",
    track: "JavaScript",
    topic: "Map and Set",
    title: "Count with a Map, not an object, so keys stay numbers",
    hook: "Objects turn every key into a string and inherit keys like `constructor`, while a `Map` keeps key types and an O(1) size.",
    points: [
      "`obj[3]` and `obj['3']` are the **same entry**: `Object.keys` hands back strings, so `includes(3)` fails.",
      "Objects **inherit** keys: `'constructor' in {}` is true, so a word list containing \"constructor\" breaks counting.",
      "A `Map` keeps **`1` and `'1'` apart**, inherits nothing, and `m.size` is O(1) instead of an O(n) `Object.keys`.",
      "Keys compare by **reference**: `set.has([1, 2])` is always false. Encode pairs as a string or as `r * cols + c`.",
    ],
    more: [
      {
        title: "Idioms",
        points: [
          "Count with `m.set(x, (m.get(x) ?? 0) + 1)`. Use **`??`**, not `||`, when 0 is a real stored value.",
          "Test with **`has`**: `get` returns `undefined` for a missing key and `0` for a real zero.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "`m[key] = v` sets a **property**, not an entry: `m.get(key)` won't see it.",
          "`m.size()` throws: **`size`** is a property.",
          "`JSON.stringify(m)` gives `{}`. Log the map directly, or **spread** it: `[...m]`.",
        ],
      },
    ],
    code: `const count = {};
for (const n of [3, 10, 3]) count[n] = (count[n] ?? 0) + 1;
console.log(Object.keys(count)); // ["3", "10"]: strings

const m = new Map();
for (const n of [3, 10, 3]) m.set(n, (m.get(n) ?? 0) + 1);
console.log([...m.keys()], m.size); // [3, 10] 2

const seen = new Set([[0, 1], "0,1"]);
console.log(seen.has([0, 1]), seen.has("0,1")); // false true`,
    source: "/dsa/js#map-set",
  },
  {
    id: "js-recursion-depth",
    track: "JavaScript",
    topic: "Recursion",
    title: "About 10,000 nested calls, then a RangeError",
    hook: "Recursion over a linked list, a skewed tree or a big grid can go n levels deep, and the stack runs out long before n = 10^5.",
    points: [
      "V8's stack is about 1 MB: **roughly 10,000 frames** for a tiny function, fewer when each frame holds more locals.",
      "Going over throws `RangeError: Maximum call stack size exceeded`, and you **can't raise** the limit on a judge.",
      "Balanced trees are safe at O(log n) depth. A **linked list, skewed tree or grid path** can be n deep: use a loop.",
      "**Tail calls aren't optimised** in V8 or Firefox: `return f(n - 1, acc)` still adds a frame. Rewrite it as a `while`.",
    ],
    more: [
      {
        title: "Memoise safely",
        points: [
          "Test the cache with **`memo.has(i)`** or a sentinel like -1, never `if (memo[i])`: a cached 0 is falsy.",
          "Create the memo **inside** the main function, or it carries answers into the next test case.",
        ],
      },
      {
        title: "Pass indices",
        points: ["`solve(arr.slice(1))` copies O(n) per call, **O(n²)** overall. Pass the whole array and an index instead."],
      },
    ],
    code: `const countDown = (n) => (n === 0 ? 0 : countDown(n - 1));
console.log(countDown(1000)); // 0: a depth of 1000 is fine
try {
  countDown(1e6);
} catch (e) {
  console.log(e.message); // Maximum call stack size exceeded
}
let n = 1e6; // the same steps as a loop: O(1) stack
while (n !== 0) n -= 1;
console.log(n); // 0`,
    say: "Recursion is fine on a balanced tree, but this list can be 10^5 long and V8 allows roughly 10,000 frames, so I'd use a loop or an explicit stack.",
    source: "/dsa/js#recursion",
  },
  {
    id: "js-queue-shift",
    track: "JavaScript",
    topic: "Queues",
    title: "shift() is O(n), so give your BFS queue a head index",
    hook: "A BFS built on `shift()` passes the small examples and times out on the large hidden tests, and two lines fix it.",
    points: [
      "`shift()` removes the first element and **moves every other element** down a slot: O(n) per call, O(n²) for a BFS.",
      "V8 hides this below **roughly 16,000 items**, which is why small tests pass. `unshift()` costs the same.",
      "Never remove from the front: keep a **`head` index** and read `queue[head++]` in O(1).",
      "Loop on **`head < queue.length`**. `while (queue.length)` never ends, because nothing is ever removed.",
    ],
    more: [
      {
        title: "Levels and visited",
        points: [
          "Level order: save **`size = queue.length - head`** before the inner loop.",
          "Mark nodes visited **when you enqueue** them, or duplicates flood the queue.",
        ],
      },
      {
        title: "Stacks and deques",
        points: [
          "An array is already a **stack**: `push`, `pop` and `at(-1)` all work on the end in O(1).",
          "Sliding window max needs only `pop()` plus a head index. A **ring buffer** is for pushes at both ends.",
        ],
      },
    ],
    code: `function bfsOrder(adj, start) {
  const queue = [start], seen = new Set([start]);
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++]; // O(1) dequeue: nothing moves
    for (const next of adj[node])
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
  }
  return queue; // every node, in BFS order
}`,
    say: "I'd avoid shift() because it's O(n) per call. A head index makes each dequeue O(1), so the BFS stays O(V + E).",
    source: "/dsa/js#stack-queue-deque",
  },
  {
    id: "js-no-builtin-heap",
    track: "JavaScript",
    topic: "Priority queue",
    title: "JavaScript has no priority queue, so bring a 40-line heap",
    hook: "Top k, k-way merge and Dijkstra all need one, and re-sorting an array after every insert costs O(n log n) per operation.",
    points: [
      "A binary heap is a **complete tree in an array**: the parent of i is `(i - 1) >> 1`, its children `2i + 1` and `2i + 2`.",
      "**push** appends a leaf and sifts it up; **pop** moves the last leaf to the root and sifts it down. Both are O(log n).",
      "One class with a **comparator** covers everything: `(a, b) => b - a` for a max-heap, `a[0] - b[0]` for tuples.",
      "A heap can't change a priority in place. Push a **new entry** and skip the stale one when it pops.",
    ],
    more: [
      {
        title: "Heap or sort?",
        points: [
          "All items known and all needed in order: **sort once**. Items arriving over time, or only k of them: a **heap**.",
          "**Heapify** builds a heap from n items in O(n); n separate pushes cost O(n log n).",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A comparator that returns a **boolean** never returns a negative number and silently breaks the heap.",
          "The default `a - b` on tuples computes **NaN**. Always pass a comparator for arrays and objects.",
          "`pop()` on an empty heap returns `undefined`: check **`size`** before destructuring the result.",
        ],
      },
    ],
    code: `function heapPush(heap, x, cmp = (a, b) => a - b) { // min-heap
  heap.push(x); // add as the last leaf, then sift it up
  for (let i = heap.length - 1; i > 0; ) {
    const parent = (i - 1) >> 1;
    if (cmp(heap[i], heap[parent]) >= 0) break; // parent first: done
    [heap[i], heap[parent]] = [heap[parent], heap[i]];
    i = parent;
  }
}`,
    say: "JavaScript has no built-in priority queue, so I'd write a small binary heap with a comparator: push sifts up, pop sifts down, both O(log n).",
    source: "/dsa/js#heap",
  },
  {
    id: "js-bitwise-32-bit",
    track: "JavaScript",
    topic: "Bitwise",
    title: "Bitwise operators squeeze numbers into 32 signed bits",
    hook: "Numbers are 64-bit floats, but `&`, `|`, `^`, `~`, `<<` and `>>` work on a 32-bit signed copy, so big values wrap around.",
    points: [
      "Fractions are truncated and bits above 31 are **dropped**: `(2 ** 32 + 5) | 0` is `5`, `3.9 | 0` is `3`.",
      "Bit 31 is the **sign**: `1 << 31` is negative, and **`1 << 32` is 1** because shift counts wrap at 32.",
      "`x >>> 0` reads the same 32 bits as **unsigned**. Use it on results that may have bit 31 set.",
      "Bitwise operators bind **looser than `===`**: `x & 1 === 0` means `x & (1 === 0)`. Parenthesise.",
    ],
    more: [
      {
        title: "Wider values",
        points: ["Past 31 bits, use arithmetic (`Math.floor(x / 2)`, `2 ** k`) or **BigInt**: `1n << 40n`."],
      },
      {
        title: "Watch out",
        points: [
          "`(-5).toString(2)` prints `-101`. Use **`(x >>> 0).toString(2)`** to see the two's complement bits.",
          "A popcount loop on `n > 0` returns 0 for negatives: loop on **`n !== 0`**.",
          "XOR swap zeroes the value when both indices are equal: **swap with destructuring**.",
        ],
      },
    ],
    code: `console.log(1 << 30, 1 << 31, 1 << 32); // 1073741824 -2147483648 1
console.log((2 ** 32 + 5) | 0, 3.9 | 0); // 5 3
console.log(-1 >>> 0); // 4294967295: the same bits, unsigned
const x = 6;
console.log(x & 1 === 0, (x & 1) === 0); // 0 true
console.log(1n << 40n); // 1099511627776n: BigInt for wide masks`,
    source: "/dsa/js#bitwise",
  },
  {
    id: "js-complexity-budget",
    track: "JavaScript",
    topic: "Complexity",
    title: "Read n from the constraints to know which Big-O fits",
    hook: "About 10^8 simple steps run per second, so working back from the largest n tells you the complexity to aim for.",
    points: [
      "n up to 10–12: **`O(n!)`**. Up to 20–25: **O(2^n)**, subsets and bitmask DP. Up to 100–500: O(n³).",
      "n up to 1,000–5,000: **O(n²)**. Up to 10^5–10^6: **O(n log n)**, with sorting, heaps or binary search.",
      "Budget **10^7 steps** per second instead when each step touches a `Map` or a `Set`, or builds a string.",
      "One hidden scan inside a loop makes O(n) into **O(n²)**: `includes`, `indexOf`, `shift`, `slice` and spread copies.",
    ],
    more: [
      {
        title: "Fixes",
        points: [
          "`out.includes(x)` → keep a **`Set`**. `queue.shift()` → a **head index**. `out = [...out, x]` → `out.push(x)`.",
          "`solve(arr.slice(1))` → pass an **index**. Sorting inside a loop → sort once, or use a heap.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "`Math.max(...arr)` throws a **`RangeError`** on huge arrays: engines cap the argument count. Loop instead.",
          "String keys cost their **length** to build and hash, so number keys are cheaper.",
        ],
      },
    ],
    code: `function uniqueSlow(nums) { // O(n²): includes scans out each time
  const out = [];
  for (const x of nums) if (!out.includes(x)) out.push(x);
  return out;
}
// O(n): a Set answers membership in O(1) on average
const unique = (nums) => [...new Set(nums)];`,
    say: "With n up to 10^5 I'm aiming for O(n log n) or better, so no includes, shift or slice inside the main loop.",
    source: "/dsa/js#complexity",
  },
];
