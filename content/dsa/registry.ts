// Single source of truth for the DSA track: the JavaScript cheat sheet topics and the pattern path.
// Pattern bodies live in content/dsa/patterns/<dir>/page.mdx; cheat sheet topics in content/dsa/js/<file>.mdx.
// Problems are folders in content/dsa/problems/<slug>/ and are discovered from disk (src/lib/dsa/load.ts).

export type JsGroup = "Language" | "Collections" | "Functions" | "Data structures" | "Performance";

export interface JsTopic {
  /** Anchor id on /dsa/js (#id) and the value used in `js: [...]` refs. */
  id: string;
  /** content/dsa/js/<file>.mdx */
  file: string;
  title: string;
  group: JsGroup;
  summary: string;
}

export type PatternGroup = "Arrays & strings" | "Linked lists" | "Trees" | "Graphs" | "Search & optimisation" | "Bits";

export interface Pattern {
  slug: string;
  dir: string;
  order: number;
  title: string;
  short: string;
  group: PatternGroup;
  summary: string;
  minutes: number;
  /** Phrases in a problem statement that hint at this pattern. */
  signals: string[];
  /** Cheat sheet topics this pattern leans on (JsTopic ids). */
  js: string[];
  next: string;
}

export const jsTopics: JsTopic[] = [
  { id: "variables-types", file: "01-variables-types", title: "Variables, types and equality", group: "Language", summary: "let vs const, primitives vs references, typeof, === and the truthy/falsy rules that decide every if." },
  { id: "numbers-math", file: "02-numbers-math", title: "Numbers, Math and integer tricks", group: "Language", summary: "Integer division, modulo with negatives, Infinity as a sentinel, safe integers, BigInt and floating point." },
  { id: "strings", file: "03-strings", title: "Strings and characters", group: "Language", summary: "Immutable strings, char codes, slicing, splitting and joining, and building strings without O(n²) concatenation." },
  { id: "arrays", file: "04-arrays", title: "Arrays: create, read, update", group: "Collections", summary: "Creating 1D and 2D arrays safely, push/pop vs shift/unshift costs, slice vs splice, and at(-1)." },
  { id: "array-methods", file: "05-array-methods", title: "Iterating and transforming arrays", group: "Collections", summary: "for, for...of, forEach, map, filter, reduce, some, every, find and when each one is the right tool." },
  { id: "sorting", file: "06-sorting", title: "Sorting and comparators", group: "Collections", summary: "The default lexicographic sort trap, numeric and multi-key comparators, stability and toSorted." },
  { id: "objects", file: "07-objects", title: "Objects as records and dictionaries", group: "Collections", summary: "Object literals, dynamic keys, Object.keys/values/entries, and why string keys bite when you count numbers." },
  { id: "map-set", file: "08-map-set", title: "Map and Set", group: "Collections", summary: "The hash map and hash set of JavaScript: O(1) average lookups, counting, grouping and encoding composite keys." },
  { id: "destructuring-spread", file: "09-destructuring-spread", title: "Destructuring, spread and rest", group: "Language", summary: "Swap in one line, unpack pairs in loops, copy arrays shallowly and collect arguments." },
  { id: "functions-closures", file: "10-functions-closures", title: "Functions, arrow functions and closures", group: "Functions", summary: "Declarations vs arrows, default parameters, closures that hold state, and nested helpers for DFS." },
  { id: "recursion", file: "11-recursion", title: "Recursion, the call stack and memoization", group: "Functions", summary: "Base cases, how deep JavaScript can recurse, memoizing with a Map, and turning recursion into a loop." },
  { id: "classes", file: "12-classes", title: "Classes for data structures", group: "Functions", summary: "class syntax, constructors, methods, getters and private fields for Trie, UnionFind and friends." },
  { id: "iterators-generators", file: "13-iterators-generators", title: "Iteration protocols and generators", group: "Functions", summary: "What for...of really iterates, entries() and keys(), and generators for lazy traversals." },
  { id: "stack-queue-deque", file: "14-stack-queue-deque", title: "Stacks, queues and deques", group: "Data structures", summary: "Arrays as stacks, why shift() is O(n), a head-index queue, and a ring-buffer deque." },
  { id: "linked-list-tree-nodes", file: "15-linked-list-tree-nodes", title: "Linked list and tree nodes", group: "Data structures", summary: "ListNode and TreeNode, dummy heads, building from arrays, and walking pointers without losing nodes." },
  { id: "heap", file: "16-heap", title: "Heaps and priority queues", group: "Data structures", summary: "JavaScript has no built-in heap. A 40-line binary heap with a comparator, and how to use it as min or max heap." },
  { id: "graphs-in-js", file: "17-graphs-in-js", title: "Graphs and grids in JavaScript", group: "Data structures", summary: "Adjacency lists from edge lists, matrices, 4- and 8-direction arrays for grids, and visited sets." },
  { id: "bitwise", file: "18-bitwise", title: "Bitwise operators", group: "Language", summary: "&, |, ^, ~, <<, >> and >>>, the 32-bit rule, masks, and the tricks interviewers expect." },
  { id: "complexity", file: "19-complexity", title: "Big-O of built-in operations", group: "Performance", summary: "What each Array, String, Map and Set method costs, so a hidden O(n) never turns your O(n) into O(n²)." },
  { id: "gotchas", file: "20-gotchas", title: "Gotchas and debugging", group: "Performance", summary: "The bugs that fail hidden tests: shared rows in 2D arrays, sort() without a comparator, floating point, and more." },
];

export const patterns: Pattern[] = [
  {
    slug: "hashing", dir: "01-hashing", order: 1, title: "Hash Maps and Sets", short: "Hashing", group: "Arrays & strings",
    summary: "Trade memory for time: remember what you have seen so each lookup is O(1) instead of another scan.",
    minutes: 25, signals: ["have I seen this before?", "count occurrences", "find a pair or complement", "group by a key"],
    js: ["map-set", "objects", "strings"], next: "When the input is sorted, you can often drop the hash map and walk two pointers instead.",
  },
  {
    slug: "two-pointers", dir: "02-two-pointers", order: 2, title: "Two Pointers", short: "Two pointers", group: "Arrays & strings",
    summary: "Walk two indices through an array, from both ends or at two speeds, so one pass replaces a nested loop.",
    minutes: 30, signals: ["sorted array", "pair or triplet with a target sum", "palindrome", "in place, O(1) extra space"],
    js: ["arrays", "sorting", "destructuring-spread"], next: "Two pointers that move in the same direction and track the range between them form a sliding window.",
  },
  {
    slug: "sliding-window", dir: "03-sliding-window", order: 3, title: "Sliding Window", short: "Sliding window", group: "Arrays & strings",
    summary: "Keep a window over a contiguous range and update it incrementally as it slides, instead of recomputing every subarray.",
    minutes: 30, signals: ["contiguous subarray or substring", "longest / shortest / at most k", "fixed window of size k"],
    js: ["map-set", "strings", "stack-queue-deque"], next: "Windows answer questions about one range at a time; prefix sums answer any range in O(1).",
  },
  {
    slug: "prefix-sum", dir: "04-prefix-sum", order: 4, title: "Prefix Sums and Difference Arrays", short: "Prefix sums", group: "Arrays & strings",
    summary: "Precompute running totals once, then answer any range-sum question by subtracting two numbers.",
    minutes: 25, signals: ["sum of a range", "subarray sums to k", "many range queries", "apply many range updates"],
    js: ["arrays", "map-set"], next: "Sorted data unlocks another log-time trick: binary search.",
  },
  {
    slug: "binary-search", dir: "05-binary-search", order: 5, title: "Binary Search", short: "Binary search", group: "Search & optimisation",
    summary: "Halve the search space every step, on a sorted array or on the answer itself, for O(log n) decisions.",
    minutes: 30, signals: ["sorted or rotated array", "find the first / last position", "minimum value that works", "O(log n) required"],
    js: ["numbers-math", "arrays"], next: "Stacks remember what is still waiting for an answer.",
  },
  {
    slug: "stack", dir: "06-stack", order: 6, title: "Stacks and Monotonic Stacks", short: "Stacks", group: "Arrays & strings",
    summary: "Use a stack for anything nested or most-recent-first, and a monotonic stack to find the next greater or smaller element in O(n).",
    minutes: 30, signals: ["matching brackets", "next greater / smaller element", "evaluate an expression", "undo the most recent"],
    js: ["stack-queue-deque", "arrays"], next: "Intervals are another kind of ordered data where sorting first does most of the work.",
  },
  {
    slug: "intervals", dir: "07-intervals", order: 7, title: "Intervals and Sweep Line", short: "Intervals", group: "Arrays & strings",
    summary: "Sort intervals by start, then merge, insert or count overlaps in a single sweep.",
    minutes: 25, signals: ["meetings, bookings, ranges", "overlapping intervals", "minimum rooms or arrows"],
    js: ["sorting", "destructuring-spread", "heap"], next: "Next: linked lists, where two pointers moving at different speeds find cycles and middles.",
  },
  {
    slug: "fast-slow-pointers", dir: "08-fast-slow-pointers", order: 8, title: "Fast and Slow Pointers", short: "Fast & slow", group: "Linked lists",
    summary: "Move one pointer twice as fast as the other to detect cycles, find the middle, or find where a loop starts, in O(1) space.",
    minutes: 25, signals: ["linked list cycle", "middle of a list", "a sequence that may loop", "O(1) extra space"],
    js: ["linked-list-tree-nodes"], next: "Linked lists are also rewired in place, by reversing next pointers.",
  },
  {
    slug: "linked-list-reversal", dir: "09-linked-list-reversal", order: 9, title: "In-place Linked List Manipulation", short: "List reversal", group: "Linked lists",
    summary: "Reverse, merge and splice lists by rewiring next pointers with prev/curr/next, using a dummy head to remove edge cases.",
    minutes: 30, signals: ["reverse a list or part of it", "merge sorted lists", "remove the nth node", "reorder nodes"],
    js: ["linked-list-tree-nodes", "destructuring-spread"], next: "Trees are linked lists with two next pointers. Depth-first search walks them recursively.",
  },
  {
    slug: "tree-dfs", dir: "10-tree-dfs", order: 10, title: "Tree Depth-First Search", short: "Tree DFS", group: "Trees",
    summary: "Solve a tree problem by solving it for the left and right subtrees and combining the answers on the way back up.",
    minutes: 35, signals: ["binary tree or BST", "depth, height, diameter", "root-to-leaf paths", "validate a BST"],
    js: ["recursion", "linked-list-tree-nodes", "functions-closures"], next: "When the question is about levels, go breadth-first instead.",
  },
  {
    slug: "tree-bfs", dir: "11-tree-bfs", order: 11, title: "Tree Breadth-First Search", short: "Tree BFS", group: "Trees",
    summary: "Process a tree level by level with a queue, which makes level sums, views and minimum depths natural.",
    minutes: 25, signals: ["level order", "each level / row", "minimum depth", "left or right side view"],
    js: ["stack-queue-deque", "linked-list-tree-nodes"], next: "A tree with up to 26 children per node is a trie, built for prefixes.",
  },
  {
    slug: "trie", dir: "12-trie", order: 12, title: "Tries (Prefix Trees)", short: "Trie", group: "Trees",
    summary: "Store strings character by character in a tree so prefix lookups cost O(length of word), not O(number of words).",
    minutes: 25, signals: ["prefix", "autocomplete", "dictionary of words", "search many words in a grid"],
    js: ["classes", "map-set", "strings"], next: "Heaps keep the best k items at hand while data streams past.",
  },
  {
    slug: "heaps", dir: "13-heaps", order: 13, title: "Heaps: Top-K, K-way Merge and Two Heaps", short: "Heaps", group: "Trees",
    summary: "A heap gives you the smallest (or largest) item in O(1) and updates in O(log n): perfect for top-k, merging k sorted lists and running medians.",
    minutes: 35, signals: ["k largest / smallest / closest", "merge k sorted", "running median", "always process the cheapest next"],
    js: ["heap", "classes", "sorting"], next: "Graphs generalise trees: any node can link to any other.",
  },
  {
    slug: "graph-traversal", dir: "14-graph-traversal", order: 14, title: "Graph BFS and DFS", short: "Graph traversal", group: "Graphs",
    summary: "Explore grids and graphs with a visited set: DFS to flood regions, BFS for the fewest steps.",
    minutes: 35, signals: ["grid of cells", "islands, regions, connected", "fewest steps / moves", "spreads each minute"],
    js: ["graphs-in-js", "stack-queue-deque", "map-set"], next: "When edges mean 'must come before', order the nodes topologically.",
  },
  {
    slug: "topological-sort", dir: "15-topological-sort", order: 15, title: "Topological Sort", short: "Topological sort", group: "Graphs",
    summary: "Order the nodes of a directed graph so every edge points forward, and detect cycles when that is impossible.",
    minutes: 25, signals: ["prerequisites / dependencies", "build order", "is there a cycle?", "infer an ordering"],
    js: ["graphs-in-js", "stack-queue-deque"], next: "Union-find answers 'are these connected?' as edges arrive.",
  },
  {
    slug: "union-find", dir: "16-union-find", order: 16, title: "Union-Find (Disjoint Set Union)", short: "Union-find", group: "Graphs",
    summary: "Track which items belong to the same group with near-constant-time union and find, using path compression and union by rank.",
    minutes: 25, signals: ["connected components", "merge groups", "does this edge create a cycle?", "equivalence"],
    js: ["classes", "arrays"], next: "Weighted edges need shortest-path algorithms.",
  },
  {
    slug: "shortest-paths", dir: "17-shortest-paths", order: 17, title: "Shortest Paths: BFS, Dijkstra, Bellman-Ford", short: "Shortest paths", group: "Graphs",
    summary: "BFS for unweighted graphs, Dijkstra with a heap for non-negative weights, and Bellman-Ford when the number of edges is limited.",
    minutes: 35, signals: ["minimum cost / time / effort", "weighted edges", "at most k stops", "network delay"],
    js: ["heap", "graphs-in-js"], next: "Backtracking explores every choice, undoing each one before trying the next.",
  },
  {
    slug: "backtracking", dir: "18-backtracking", order: 18, title: "Backtracking", short: "Backtracking", group: "Search & optimisation",
    summary: "Build a solution one choice at a time, recurse, then undo the choice: the template behind subsets, permutations and puzzles.",
    minutes: 35, signals: ["all combinations / permutations / subsets", "generate every valid", "place items with constraints"],
    js: ["recursion", "arrays", "destructuring-spread"], next: "Sometimes the locally best choice is provably globally best: greedy.",
  },
  {
    slug: "greedy", dir: "19-greedy", order: 19, title: "Greedy", short: "Greedy", group: "Search & optimisation",
    summary: "Make the best local choice at each step and prove it never hurts, usually after sorting.",
    minutes: 25, signals: ["maximum / minimum with a simple rule", "can you reach the end?", "schedule or assign", "one pass after sorting"],
    js: ["sorting", "numbers-math"], next: "When greedy fails, remember subproblem answers: dynamic programming.",
  },
  {
    slug: "dp-1d", dir: "20-dp-1d", order: 20, title: "Dynamic Programming I: 1D", short: "DP 1D", group: "Search & optimisation",
    summary: "Define what dp[i] means, write how it depends on smaller i, and fill a table instead of recomputing overlapping subproblems.",
    minutes: 40, signals: ["number of ways", "minimum / maximum cost", "can it be done?", "choices at each step overlap"],
    js: ["recursion", "arrays", "map-set"], next: "Two inputs or a grid make the table two-dimensional.",
  },
  {
    slug: "dp-2d", dir: "21-dp-2d", order: 21, title: "Dynamic Programming II: Grids, Strings and Knapsack", short: "DP 2D", group: "Search & optimisation",
    summary: "dp[i][j] over two strings, a grid, or items × capacity: the same recipe with one more dimension.",
    minutes: 40, signals: ["two strings", "grid paths", "pick items under a budget", "edit / match / subsequence"],
    js: ["arrays", "gotchas", "recursion"], next: "Last stop: bits, where tiny operators replace whole data structures.",
  },
  {
    slug: "bit-manipulation", dir: "22-bit-manipulation", order: 22, title: "Bit Manipulation", short: "Bits", group: "Bits",
    summary: "XOR cancels pairs, masks test and set flags, and n & (n - 1) drops the lowest set bit.",
    minutes: 20, signals: ["every element appears twice except one", "count set bits", "without + or -", "subsets as bitmasks"],
    js: ["bitwise", "numbers-math"], next: "",
  },
];

export const getPattern = (slug: string) => patterns.find((p) => p.slug === slug);
export const getJsTopic = (id: string) => jsTopics.find((t) => t.id === id);
export const PATTERN_GROUPS: PatternGroup[] = ["Arrays & strings", "Search & optimisation", "Linked lists", "Trees", "Graphs", "Bits"];
export const JS_GROUPS: JsGroup[] = ["Language", "Collections", "Functions", "Data structures", "Performance"];
