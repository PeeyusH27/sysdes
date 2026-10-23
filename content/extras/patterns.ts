// Page extras for the 22 DSA patterns (content/dsa/patterns/<dir>/page.mdx), keyed by pattern slug.
// Contract: docs/AUTHORING-EXTRAS.md. Every number and trade-off below is taken from the page it belongs to.
import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  hashing: {
    doodle: "hash-map",
    // Core: the signals, the idea with its animation, the complement lookup (the template most problems reduce to), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-seen-set",
      "template-2-frequency-map",
      "template-4-group-by-a-canonical-key",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a problem asks for a pair, a complement or a count in unsorted data, I reach for a hash map: I remember what I have seen, look up before I insert, and one O(n) pass replaces the nested loop. I pay for it with O(n) memory.",
      numbers: [
        { value: "O(n)", label: "Time: one pass instead of O(n²)" },
        { value: "O(n)", label: "Space: the map holds the elements seen so far" },
        { value: "O(1) average", label: "Per lookup; O(n) if many keys collide" },
      ],
      tradeoffs: [
        "Hash map vs sorting: O(n) expected time and O(n) memory, against O(n log n) with little memory and a predictable worst case.",
        "Sorted-letters key vs count signature for anagrams: O(k log k) per word against O(k), but the signature needs a separator between counts.",
        "Map vs array of 26: for lowercase letters the array is faster and O(1) space; a Map handles any key.",
      ],
      mention:
        "Look up before you insert, or an element pairs with itself ([3, 4] with target 6 returns [0, 0]), and use has() rather than a truthy get(), because a stored index can be 0.",
    },
  },

  "two-pointers": {
    doodle: "two-pointers",
    // Core: when it applies, why each step discards something, the opposite-ends template, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-2-read-and-write-pointers",
      "template-3-one-pointer-per-input",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When the input is sorted, or I may sort it, and I need a pair or an in-place rewrite, I use two pointers. Each comparison rules one index out for good, so a single O(n) pass with O(1) extra space replaces the nested loop.",
      numbers: [
        { value: "O(n)", label: "Time on sorted input: n - 1 moves" },
        { value: "O(1)", label: "Extra space for opposite ends and read/write" },
        { value: "O(n log n)", label: "If you must sort first; the scan stays O(n)" },
      ],
      tradeoffs: [
        "Two pointers vs hash map: O(1) space but needs sorted input; the map handles unsorted data and keeps original indices at O(n) space.",
        "Sort then two pointers vs a map: sorting costs O(n log n) and loses the original indices, against one O(n) pass.",
        "Read/write pointers vs filtering into a new array: in place with O(1) extra space, against simpler code that allocates O(n).",
      ],
      mention:
        "Move a pointer after every match or the loop never ends, and use the current value before skipping duplicates, or you lose answers like [-1, -1, 2].",
    },
  },

  "sliding-window": {
    doodle: "sliding-window",
    // Core: the signals, update-don't-recompute, the longest-valid template (the one the others mirror), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-fixed-size-window",
      "template-3-shortest-valid-window",
      "template-4-monotonic-deque-for-window-max-or-min",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When I need the longest, shortest or number of contiguous ranges under a rule like at most k distinct, I keep a window with a running summary. I grow right, and shrink left while the rule is broken, so each element enters and leaves once: O(n) instead of O(n · k).",
      numbers: [
        { value: "O(n)", label: "Time: each element enters and leaves once" },
        { value: "O(a)", label: "Space for counts over an alphabet of size a" },
        { value: "2n moves", label: "At most; neither pointer ever moves back" },
      ],
      tradeoffs: [
        "Sliding window vs prefix sums: a window is O(1) space but needs non-negative values; prefix sums plus a map handle negatives in O(n) space.",
        "Monotonic deque vs heap for window maximum: the deque is O(n); a max-heap that pops stale tops is O(n log n) but easier to explain.",
        "Exactly k vs at most k: exactly(k) = atMost(k) - atMost(k - 1), two O(n) passes, because only the at-most rule is monotonic.",
      ],
      mention:
        "Shrink with while, not if, and watch the off-by-ones: the length is right - left + 1 and the first full window of size k ends at index k - 1.",
    },
  },

  "prefix-sum": {
    // No doodle: a running-total staircase has no matching drawing.
    // Core: the signals, a range as a difference of prefixes, prefix sum + hash map (the interview favourite), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-running-sums-for-range-queries",
      "template-3-2d-prefix-sums",
      "template-4-difference-arrays-for-range-updates",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When I need many range sums, or a subarray that sums to k even with negatives, I store running totals: a range is prefix[right + 1] minus prefix[left]. With a hash map of earlier prefixes it is one O(n) pass, paid for with O(n) memory.",
      numbers: [
        { value: "O(1) per query", label: "After an O(n) build" },
        { value: "O(n)", label: "Space: prefix array or distinct prefix sums" },
        { value: "n + 1 entries", label: "Prefix array length, with prefix[0] = 0" },
      ],
      tradeoffs: [
        "Prefix sums vs sliding window: a window is O(1) space but needs non-negative values; prefix sums plus a map handle negatives and exact sums.",
        "Prefix array vs Fenwick tree: the array is O(1) per query but an update costs O(n); a Fenwick tree makes both O(log n).",
        "Difference array vs looping over each range: O(1) per update plus one O(n) final pass, against touching every cell of every range.",
      ],
      mention:
        "Keep one convention (with n + 1 entries it is prefix[r + 1] - prefix[l]), seed the map with 0, and look up sum - k before you insert sum.",
    },
  },

  "binary-search": {
    doodle: "binary-search",
    // Core: the signals, the invariant, first-true (the template that prevents off-by-ones), search on the answer
    // (the only place that idea appears), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-exact-match",
      "template-3-rotated-sorted-arrays",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When the input is sorted or rotated, or the answer is the smallest value that makes a yes/no check pass, I binary search: I keep a range that must contain the answer and halve it every step. I use the first-true template, which avoids most off-by-one bugs.",
      numbers: [
        { value: "O(log n)", label: "Checks; about 20 for a million" },
        { value: "O(1)", label: "Extra space, iterative" },
        { value: "O(n log R)", label: "Searching an answer range R, O(n) per check" },
      ],
      tradeoffs: [
        "Exact match vs first true: exact match stops at a hit; first true also finds bounds and insert positions, and ends on the answer.",
        "Binary search vs trying every value: O(n log R) against a linear sweep that is hopeless when the answer can reach 10^9.",
        "Distinct vs repeated values in a rotated array: O(log n) against O(n) worst case, because equal lo, mid and hi hide which half is sorted.",
      ],
      mention:
        "Never write lo = mid with a rounded-down mid, start hi at n when past-the-end is a valid answer, and trace 0, 1 and 2 candidates by hand.",
    },
  },

  stack: {
    doodle: "stack",
    // Core: the signals, newest-closes-first, the monotonic stack (the O(n) trick), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-matching-and-nesting",
      "template-3-monotonic-increasing-stack-next-smaller-both-sides",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When things open and close in a nested way, or I need the next greater or smaller element for each position, I use a stack, because the newest unfinished item resolves first. A monotonic stack pops everything a new element beats, so every answer comes in one O(n) pass instead of O(n²).",
      numbers: [
        { value: "O(n) amortised", label: "Time: n pushes, at most n pops" },
        { value: "O(n)", label: "Space in the worst case, everything nested" },
        { value: "O(1)", label: "Push, pop or peek at the array end" },
      ],
      tradeoffs: [
        "Stack vs a counter per bracket type: a counter accepts ([)], the stack catches the crossing the moment it happens, at O(n) worst-case memory.",
        "Monotonic stack vs brute force: O(n) amortised against O(n²) on a falling array, for O(n) extra space.",
        "Indices vs values on the stack: indices cost the same and give positions and distances; values alone cannot compute a width.",
      ],
      mention:
        "Check the stack is non-empty before you peek (stack.at(-1) is undefined and the comparison silently fails), and read whether ties are strict or 'or equal'.",
    },
  },

  intervals: {
    // No doodle: nothing in the set draws overlapping ranges.
    // Core: the signals, sorting makes overlap local, merge and the sweep-line count (rooms), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-3-keep-the-most-remove-the-fewest",
      "template-4-two-sorted-lists",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When I see [start, end] pairs and a question about overlap, I sort first: by start to merge or find clashes, by end to keep the most. Then one sweep answers it, and +1/-1 events or a min-heap of end times count the rooms. That is O(n log n) instead of comparing every pair.",
      numbers: [
        { value: "O(n log n)", label: "Time: the sort dominates the sweep" },
        { value: "O(n)", label: "Space: output, events or heap" },
        { value: "-1 before +1", label: "Order for events at the same time" },
      ],
      tradeoffs: [
        "Sweep line vs min-heap: both O(n log n); the sweep line is shorter for how many rooms, the heap suits assigning rooms or streams.",
        "Sort by start vs by end: start merges and finds clashes; end keeps the most, since [1, 100] first would block everything.",
        "Sorting vs difference array: small integer coordinates allow +1 at start, -1 at end and one prefix sum, with no O(n log n) sort.",
      ],
      mention:
        "Settle whether touching intervals overlap before coding ([1, 3] and [3, 5] clash with <= but not with <), and extend with Math.max because a later interval can sit inside an earlier one.",
    },
  },

  "fast-slow-pointers": {
    doodle: "linked-list",
    // Core: the signals, the faster runner laps the slower, cycle detection with its entry (the headline use), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-find-the-middle",
      "template-3-cycles-in-implicit-sequences",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a linked list may have a cycle, or I need its middle, or a rule-defined sequence may repeat, and O(1) space is required, I run two pointers: slow moves one step, fast two. Fast laps slow inside a loop so they meet, and a second walk from the head finds where the loop starts.",
      numbers: [
        { value: "O(n)", label: "Time: slow is caught within its first lap" },
        { value: "O(1)", label: "Extra space, against O(n) for a visited Set" },
        { value: "1 and 2", label: "Steps per move for slow and fast" },
      ],
      tradeoffs: [
        "Floyd vs a visited Set: the Set is simpler and also O(n) time but costs O(n) memory; Floyd is O(1) space and answers the follow-up.",
        "Speed 2 vs 3: both meet, but only speed 2 makes the second walk land on the entry; with 3 it can miss.",
        "Second middle vs first middle: 'fast && fast.next' stops on the second on even lengths; 'fast.next && fast.next.next' gives the first, for cutting.",
      ],
      mention:
        "Check fast before fast.next in the loop condition (null.next throws), compare nodes rather than values, and remember the meeting point is inside the loop, not necessarily its entry.",
    },
  },

  "linked-list-reversal": {
    doodle: "linked-list",
    // Core: the signals, save-before-you-cut (with the reversal animation), the dummy head, the sublist splice, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-reverse-a-whole-list",
      "template-4-split-reverse-weave",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "To reverse, merge, reorder or remove nodes in place, I rewire next pointers instead of copying values: save curr.next, flip, advance. I put a dummy node in front when the head can change, and fix the two end links after a splice. It is O(n) time and O(1) space.",
      numbers: [
        { value: "O(n)", label: "Time: each node is rewired at most once" },
        { value: "O(1)", label: "Extra space; copying to an array is O(n)" },
        { value: "3 pointers", label: "prev, curr and next for an in-place reversal" },
      ],
      tradeoffs: [
        "Iterative vs recursive reversal: same O(n) time, but recursion holds one frame per node and can overflow on lists of tens of thousands.",
        "Dummy head vs special-casing the head: one extra node gives the head a predecessor, so edits need fewer branches and fewer bugs.",
        "Reverse the back half vs copy values to an array: O(1) against O(n) extra space, but cut first or you create a cycle.",
      ],
      mention:
        "Save curr.next before you overwrite it, return prev or dummy.next rather than the old head, and test lists of length 0, 1 and 2.",
    },
  },

  "tree-dfs": {
    doodle: "tree",
    // Core: the signals, trust the recursive call, the global-best template (the one that trips people), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-return-a-value-up",
      "template-2-carry-state-down",
      "template-4-bst-bounds-and-ordering",
      "template-5-iterative-dfs-with-an-explicit-stack",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "For a tree problem I assume the recursive call works on each subtree, then write only the base case and the combine step at the node. Answers return up or are carried down, and paths that bend keep a global best. That is O(n) time and O(h) stack.",
      numbers: [
        { value: "O(n)", label: "Time: each node is entered once" },
        { value: "O(h)", label: "Stack: log n balanced, n skewed" },
        { value: "~10,000 frames", label: "Rough V8 limit; a 10^5 chain overflows" },
      ],
      tradeoffs: [
        "Recursive vs iterative DFS: recursion is shorter and easier to get right; an explicit stack has no depth limit but is more code.",
        "Return heights vs recompute them: one post-order pass is O(n); recomputing height at every node is O(n²) on a skewed tree.",
        "DFS vs BFS on a tree: DFS holds one path, BFS holds one level and can stop at the first leaf; BFS suits level questions.",
      ],
      mention:
        "A leaf has both children null (a one-child node is not a leaf), start maximums at -Infinity when values can be negative, and copy a shared path array before storing it.",
    },
  },

  "tree-bfs": {
    doodle: "tree",
    // Core: the signals, the queue keeps levels in order, the level-size loop every level problem edits, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-2-stop-at-the-first-match",
      "template-3-a-queue-that-never-shifts",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When the answer is per level, visible from one side, or the nearest something, I go breadth-first with a queue. I snapshot the queue size when a level starts, so I know exactly where it ends, and I can stop at the first match. It is O(n) time and O(w) space for the widest level.",
      numbers: [
        { value: "O(n)", label: "Time: each node enqueued and dequeued once" },
        { value: "O(w)", label: "Space: widest level, up to about n / 2" },
        { value: "O(n²)", label: "Worst case if you dequeue with shift()" },
      ],
      tradeoffs: [
        "BFS vs DFS for levels: BFS holds one level (about n / 2) and can stop early; DFS holds one path, n if skewed.",
        "Head index vs shift(): queue[head++] is O(1); shift() moves every element and can turn BFS into O(n²) on large queues.",
        "Reverse once vs unshift per level: for bottom-up levels run normal BFS and reverse the result once, O(n), rather than unshift each level.",
      ],
      mention:
        "Loop on the size you snapshotted, not the live queue length, or the levels run together; and never enqueue null children.",
    },
  },

  trie: {
    doodle: "trie",
    // Core: the signals, a prefix is a path, the Trie class, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "choosing-the-node-shape",
      "template-2-wildcard-search-with-dfs",
      "template-3-prune-a-search-with-the-trie",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "For many prefix questions, a dictionary matched against a sentence or a grid, or wildcards, I build a trie. Words share nodes along their prefixes, so insert, search and startsWith cost O(L) for a word of length L however many words are stored, and a search can stop the moment it leaves the trie.",
      numbers: [
        { value: "O(L)", label: "Per insert, search or prefix check" },
        { value: "O(S)", label: "Build time and nodes; S is total characters" },
        { value: "26 slots", label: "Per node with an array of children" },
      ],
      tradeoffs: [
        "Trie vs hash set: a Set is simpler, smaller and also O(L) for exact words; a trie wins on prefixes, wildcards and early stopping.",
        "Map vs array of 26: the array is fastest for a small known alphabet but always spends 26 slots; a Map stores only existing children.",
        "Top-k per node vs DFS below the prefix: O(L) queries for more memory and slower inserts, against a DFS per query.",
      ],
      mention:
        "search must check the end flag, not just that the path exists (car is a path inside cart), and a grid search must mark cells visited and restore them when backtracking.",
    },
  },

  heaps: {
    doodle: "heap",
    // Core: the signals, the half-sorted tree, top k with a heap of size k (the template most questions use), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-a-binary-heap-with-a-comparator",
      "template-3-k-way-merge",
      "template-4-two-heaps-for-a-running-median",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When I need the k largest, smallest or most frequent, a merge of k sorted inputs, or a running median, I use a heap: peek is O(1), push and pop are O(log n), and nothing is fully sorted. For top k I keep a min-heap of size k, so it is O(n log k) with O(k) memory.",
      numbers: [
        { value: "O(n log k)", label: "Top k of n items with a size-k heap" },
        { value: "O(log n)", label: "Push or pop: one swap per level" },
        { value: "O(k)", label: "Space for top k or a k-way merge" },
      ],
      tradeoffs: [
        "Heap vs sorting for the kth largest: a size-k heap is O(n log k), O(k) memory, works on a stream; sorting is O(n log n).",
        "Heap vs quickselect: quickselect is O(n) on average but O(n²) worst case without a random pivot and reorders the input; the heap is steady.",
        "Build by pushing vs bottom-up heapify: O(n log n) against O(n), because half the nodes are leaves and sink nowhere.",
      ],
      mention:
        "Return a number from the comparator, not a boolean, and remember the k largest need a min-heap, because you evict the smallest you keep.",
    },
  },

  "graph-traversal": {
    doodle: "graph",
    // Core: the signals, visit every node once (with the DFS animation), BFS for the fewest steps, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "building-the-graph",
      "template-1-dfs-for-regions",
      "template-3-multi-source-bfs",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When I see a grid or graph and the question is islands, connected regions or the fewest steps, I traverse with a visited mark. DFS dives and floods a region; BFS spreads in rings, so it reaches every node along the fewest edges. Both are O(V + E) if I mark nodes when I push them.",
      numbers: [
        { value: "O(V + E)", label: "Time for DFS or BFS on an adjacency list" },
        { value: "O(V)", label: "Space: visited marks plus the queue or stack" },
        { value: "E ≤ 4V", label: "Edges on a grid of V cells" },
      ],
      tradeoffs: [
        "BFS vs DFS: only BFS gives the fewest steps with equal costs; for reachability or region size both are O(V + E).",
        "Mark on push vs on pop: push gives one entry per node; marking on dequeue can queue a node once per neighbour, growing to O(E).",
        "Recursive vs iterative DFS: recursion mirrors the definition but JavaScript allows about ten thousand nested calls; a 300 × 300 grid of land needs 90,000.",
      ],
      mention:
        "Mark the start node (and every source) when you push it, check bounds before indexing the grid, and use a head index instead of queue.shift().",
    },
  },

  "topological-sort": {
    doodle: "graph",
    // Core: the signals, start with no prerequisites (Kahn's animation), Kahn's template, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-2-dfs-with-three-colours",
      "template-3-kahns-level-by-level",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a problem has prerequisites or must-happen-before rules and asks for an order, or whether it is possible, I run Kahn's algorithm: count in-degrees, queue the nodes at zero, and release their neighbours as each is placed. If fewer than V nodes come out, there is a cycle. It is O(V + E).",
      numbers: [
        { value: "O(V + E)", label: "Time: each node queued once, each edge once" },
        { value: "O(V + E)", label: "Space for the adjacency list and in-degrees" },
        { value: "length === V", label: "Order length equal to V means no cycle" },
      ],
      tradeoffs: [
        "Kahn's vs DFS: Kahn's is iterative with a one-line cycle check; DFS colours show which nodes are on or behind a cycle.",
        "Two colours vs three: a plain visited set cannot tell a gray node on the current path (a cycle) from a black one (harmless).",
        "Queue vs min-heap in Kahn's: a queue returns one valid order; swap in a min-heap for the smallest order in dictionary order.",
      ],
      mention:
        "Get the edge direction right (in Course Schedule [a, b] means b comes first, so the edge is b → a), include nodes with no edges, and return the impossible value, not a partial order, when there is a cycle.",
    },
  },

  "union-find": {
    doodle: "graph",
    // Core: the signals, one root per group (with the union-by-rank animation), the class to memorise, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-2-count-groups",
      "template-3-cycle-detection",
      "template-4-items-that-arent-numbers",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When the question is how many groups, or whether an edge closes a cycle in an undirected graph, especially as links arrive one at a time, I use union-find. Each group is a tree whose root names it; with path compression and union by rank, find and union are effectively constant.",
      numbers: [
        { value: "O(α(n))", label: "Amortised find or union, effectively O(1)" },
        { value: "α(n) ≤ 4", label: "Inverse Ackermann for any realistic input" },
        { value: "O(n)", label: "Space for parent and rank arrays" },
      ],
      tradeoffs: [
        "Union-find vs BFS/DFS for components: on a fixed graph both are linear and BFS/DFS gives paths; union-find wins when edges arrive over time.",
        "Compression plus rank vs neither: O(α(n)) amortised against O(n) worst case, because the trees become chains.",
        "Loop vs recursive find: the loop is safer in JavaScript, where a recursive find on a 100,000-node chain overflows the stack without union by rank.",
      ],
      mention:
        "Union the roots, not the items (find(a) and find(b)), lower the group count only when union returns true, and allocate n + 1 slots for 1-based labels.",
    },
  },

  "shortest-paths": {
    doodle: "graph",
    // Core: the signals, relax closest first (Dijkstra animation), the Dijkstra template, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-bfs-for-unweighted-graphs",
      "template-3-bellman-ford-round-by-round",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "Every shortest-path algorithm repeats one move, relaxation, and only the order differs. For equal edges I use BFS, for non-negative weights Dijkstra with a min-heap, and for negative weights or an at-most-k-stops limit Bellman-Ford. Dijkstra is O(E log V), and a node is final only when it is popped.",
      numbers: [
        { value: "O(E log V)", label: "Dijkstra with a heap, non-negative weights" },
        { value: "O(V · E)", label: "Bellman-Ford, which allows negative edges" },
        { value: "O(V + E)", label: "BFS when every edge costs the same" },
      ],
      tradeoffs: [
        "Dijkstra vs Bellman-Ford: O(E log V) but needs non-negative weights, against O(V · E) that handles negative edges and stop limits.",
        "Heap vs array scan for Dijkstra: the heap is O(E log V); scanning for the minimum is O(V²) and better when the graph is dense.",
        "Floyd–Warshall vs Dijkstra from every node: O(V³) with negative edges fine, against O(V · E log V) for large, sparse, non-negative graphs.",
      ],
      mention:
        "Only a pop makes a node final in Dijkstra: skip stale entries (d > dist[u]) and stop when the target is popped, not when it is pushed.",
    },
  },

  backtracking: {
    doodle: "backtracking",
    // Core: the signals, one path walked forward and back, combinations with a start index (the base template),
    // pruning (half the craft), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-2-permutations-with-used",
      "template-4-backtracking-on-a-grid",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a problem asks for all subsets, permutations or valid arrangements, or to place items under constraints, I backtrack: choose, explore everything after it, then un-choose, with one shared path. It is exponential, so I make each answer appear exactly once with a start index or used[], and prune a branch before recursing.",
      numbers: [
        { value: "O(n · 2^n)", label: "All subsets of n items, copying each" },
        { value: "O(n · n!)", label: "All permutations of n items" },
        { value: "O(n)", label: "Extra space: path and used[], besides the output" },
      ],
      tradeoffs: [
        "Start index vs used[]: when order does not matter a start index builds each combination once; when it does, used[] allows every arrangement.",
        "Prevent duplicates by construction vs dedupe with a Set afterwards: the Set is slow and a sign the choice rule is wrong.",
        "Backtracking vs DP: listing every solution is backtracking; counting them is DP, because paths reach the same subproblem and answers can be cached.",
      ],
      mention:
        "Undo every change after the recursive call (pop, used[i] = false, restore the cell), and record a copy, [...path], because the live array is empty by the end.",
    },
  },

  greedy: {
    // No doodle: none of the drawings is about choosing the locally best option.
    // Core: the signals, the proof (exchange or stays ahead), earliest end first, when greedy fails (the only place the DP hand-off is shown),
    // complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-sort-then-match",
      "template-3-one-pass-with-a-running-best",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a problem asks for a maximum or minimum count and a simple rule like earliest end, cheapest so far or furthest reach looks right, I try greedy: usually a sort plus one pass. I only trust it with a proof, an exchange argument or greedy stays ahead; if a small counterexample breaks it, I switch to DP.",
      numbers: [
        { value: "O(n log n)", label: "Sort, then one pass" },
        { value: "O(n)", label: "One pass with a running best, O(1) space" },
        { value: "coins 4, 3, 1", label: "Greedy fails at 6: three coins, not two" },
      ],
      tradeoffs: [
        "Greedy vs DP on coin change: greedy is one quick pass but can be trapped; DP costs O(amount × coins) and cannot be.",
        "Earliest end vs earliest start or shortest: only earliest end stays ahead; the other two fail on small examples.",
        "Exchange argument vs stays ahead: exchange swaps the greedy choice into any optimal solution; stays ahead shows greedy is never behind on some measure.",
      ],
      mention:
        "Attack your own rule on two to four items before coding, and watch ties: start > lastEnd rejects intervals that merely touch, where >= accepts them.",
    },
  },

  "dp-1d": {
    doodle: "dp-table",
    // Core: the signals, solve each subproblem once, the six-question recipe, fixed look-back four ways (recursion to rolling variables),
    // complexity, practice.
    detail: [
      "play-with-it",
      "template-2-dp-over-an-amount",
      "template-3-ending-at-i-looking-back-at-every-earlier-j",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When a problem asks for the number of ways or a minimum or maximum over choices, and my brute-force recursion repeats the same arguments, I use DP. I define dp[i] in words, write the recurrence from the last decision, set the base cases and fill in order. Exponential becomes O(states × choices), and rolling variables often give O(1) space.",
      numbers: [
        { value: "O(2^n) to O(n)", label: "Two-branch recursion against a memo or table" },
        { value: "O(A × k)", label: "Over an amount A with k choices" },
        { value: "O(n²)", label: "Ending at i, scanning every earlier j" },
      ],
      tradeoffs: [
        "Top-down vs bottom-up: top-down is the brute force plus a memo and suits few reachable states; bottom-up has no stack limit and allows O(1) space.",
        "DP vs greedy: coins 1, 3, 4 for amount 6 break greedy; a counterexample means DP, a proven exchange argument means greedy.",
        "Table vs rolling variables: if dp[i] reads only the last one or two cells, two variables give O(1) space; otherwise keep the array.",
      ],
      mention:
        "Say what dp[i] means in words first, size the table n + 1 when the top is index n, and test a memo with has(), not a truthy get(), because a cached 0 is a real answer.",
    },
  },

  "dp-2d": {
    doodle: "dp-table",
    // Core: the signals, a cell and its fill order, the two-strings table and knapsack (the two shapes interviewers ask), complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step-the-recipe-in-two-dimensions",
      "template-1-grid-paths",
      "reconstructing-the-answer",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When one index cannot describe a subproblem, I use two: a grid cell, a prefix of each of two strings, or the first i items with capacity c. It is the 1D recipe with one more index: define the cell, seed row 0 and column 0, compare the last decision, fill in dependency order. Time is O(m × n), and one row often gives O(n) space.",
      numbers: [
        { value: "O(m × n)", label: "Time for a grid or two strings" },
        { value: "O(n × W)", label: "Knapsack time: n items, capacity W" },
        { value: "O(min(m, n))", label: "Space for two strings with one row" },
      ],
      tradeoffs: [
        "Full table vs one row: one row cuts space to O(n) but loses the history, so you cannot walk back to rebuild the answer.",
        "Loop direction in one-row knapsack: capacity high to low is 0/1 (each item once); low to high is unbounded (items repeat).",
        "Coins outside vs amounts outside: coins outer counts each combination once (Coin Change II); amounts outer counts 1 + 2 and 2 + 1 separately.",
      ],
      mention:
        "Build rows with Array.from so they are not shared, size the table (m + 1) × (n + 1), and remember row i's letter is a[i - 1], not a[i].",
    },
  },

  "bit-manipulation": {
    // No doodle: nothing in the set draws bits.
    // Core: the signals, one operator and every bit at once (XOR animation, the 32-bit rule), XOR cancellation,
    // dropping the lowest set bit, complexity, practice.
    detail: [
      "play-with-it",
      "step-by-step",
      "template-1-masks-for-single-bits",
      "template-4-subsets-as-bitmasks",
      "javascript-youll-use",
    ],
    sayIt: {
      answer:
        "When every element appears twice except one, or I must count set bits, test a power of two, or list the subsets of a small set, I use bit tricks. XOR cancels pairs, n & (n - 1) drops the lowest set bit, and masks built with 1 << i test, set or clear one bit. Each operator is O(1).",
      numbers: [
        { value: "O(n), O(1)", label: "XOR over n values: time and space" },
        { value: "O(set bits)", label: "Popcount loop: once per set bit, max 32" },
        { value: "32 bits", label: "JavaScript bitwise operators use signed 32-bit integers" },
      ],
      tradeoffs: [
        "XOR vs per-column counts: XOR cancels pairs; with triples, count 1s in each of 32 columns modulo 3, taking O(32 · n) time.",
        "Bitmask subsets vs backtracking: counting 0 to 2^n - 1 lists every subset with no recursion, but n must stay small; backtracking handles conditions better.",
        "Plain numbers vs BigInt: plain operators are fast but 32-bit; BigInt handles 64 bits but is slower and cannot mix with plain numbers.",
      ],
      mention:
        "JavaScript bitwise operators are signed 32-bit, so use >>> 0 when bit 31 may be set, and add parentheses: (n & 1) === 0, because & binds more loosely than ===.",
    },
  },
};
