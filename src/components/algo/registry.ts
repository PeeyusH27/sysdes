// Lazy loaders for every walkthrough, by trace id, so the browser can re-run a trace on a reader's own input
// ("Edit input") without shipping all 22 viz modules up front. tests/algo-engine.test.ts fails if a trace exported
// from any content/dsa/patterns/*/viz.ts is missing here or points at the wrong export.
import type { TraceSpec } from "./types";

type Loader = () => Promise<TraceSpec>;

export const TRACE_LOADERS: Record<string, Loader> = {
  "seen-set": () => import("@content/dsa/patterns/01-hashing/viz").then((m) => m.seenSet),
  "frequency-budget": () => import("@content/dsa/patterns/01-hashing/viz").then((m) => m.frequencyBudget),
  "pair-count-map": () => import("@content/dsa/patterns/01-hashing/viz").then((m) => m.pairCount),
  "pair-sum": () => import("@content/dsa/patterns/02-two-pointers/viz").then((m) => m.pairSum),
  "remove-duplicates": () => import("@content/dsa/patterns/02-two-pointers/viz").then((m) => m.removeDuplicates),
  "sorted-squares": () => import("@content/dsa/patterns/02-two-pointers/viz").then((m) => m.sortedSquares),
  "fixed-window-sum": () => import("@content/dsa/patterns/03-sliding-window/viz").then((m) => m.fixedWindow),
  "longest-at-most-k-distinct": () => import("@content/dsa/patterns/03-sliding-window/viz").then((m) => m.longestWindow),
  "window-max-deque": () => import("@content/dsa/patterns/03-sliding-window/viz").then((m) => m.windowMaxDeque),
  "prefix-build-query": () => import("@content/dsa/patterns/04-prefix-sum/viz").then((m) => m.prefixBuildQuery),
  "prefix-first-index": () => import("@content/dsa/patterns/04-prefix-sum/viz").then((m) => m.longestSumK),
  "difference-array": () => import("@content/dsa/patterns/04-prefix-sum/viz").then((m) => m.differenceArray),
  "classic-binary-search": () => import("@content/dsa/patterns/05-binary-search/viz").then((m) => m.classicSearch),
  "lower-bound": () => import("@content/dsa/patterns/05-binary-search/viz").then((m) => m.lowerBound),
  "search-on-answer": () => import("@content/dsa/patterns/05-binary-search/viz").then((m) => m.searchOnAnswer),
  "bracket-match": () => import("@content/dsa/patterns/06-stack/viz").then((m) => m.bracketMatch),
  "next-greater-stack": () => import("@content/dsa/patterns/06-stack/viz").then((m) => m.nextGreater),
  "smaller-neighbours-stack": () => import("@content/dsa/patterns/06-stack/viz").then((m) => m.smallerNeighbours),
  "merge-sweep": () => import("@content/dsa/patterns/07-intervals/viz").then((m) => m.mergeSweep),
  "sweep-line-count": () => import("@content/dsa/patterns/07-intervals/viz").then((m) => m.sweepCount),
  "rooms-min-heap": () => import("@content/dsa/patterns/07-intervals/viz").then((m) => m.roomsHeap),
  "find-middle": () => import("@content/dsa/patterns/08-fast-slow-pointers/viz").then((m) => m.findMiddle),
  "floyd-cycle": () => import("@content/dsa/patterns/08-fast-slow-pointers/viz").then((m) => m.floydCycle),
  "implicit-cycle": () => import("@content/dsa/patterns/08-fast-slow-pointers/viz").then((m) => m.implicitCycle),
  "reverse-list": () => import("@content/dsa/patterns/09-linked-list-reversal/viz").then((m) => m.reverseList),
  "reverse-segment": () => import("@content/dsa/patterns/09-linked-list-reversal/viz").then((m) => m.reverseSegment),
  "weave-halves": () => import("@content/dsa/patterns/09-linked-list-reversal/viz").then((m) => m.weaveHalves),
  "tree-height": () => import("@content/dsa/patterns/10-tree-dfs/viz").then((m) => m.subtreeHeight),
  "carry-down-max": () => import("@content/dsa/patterns/10-tree-dfs/viz").then((m) => m.carryDown),
  "inorder-stack": () => import("@content/dsa/patterns/10-tree-dfs/viz").then((m) => m.inorderStack),
  "bfs-level-max": () => import("@content/dsa/patterns/11-tree-bfs/viz").then((m) => m.levelLoop),
  "bfs-first-leaf": () => import("@content/dsa/patterns/11-tree-bfs/viz").then((m) => m.firstLeaf),
  "trie-insert": () => import("@content/dsa/patterns/12-trie/viz").then((m) => m.trieInsert),
  "trie-search-prefix": () => import("@content/dsa/patterns/12-trie/viz").then((m) => m.trieLookup),
  "trie-wildcard": () => import("@content/dsa/patterns/12-trie/viz").then((m) => m.wildcardSearch),
  "heap-push-pop": () => import("@content/dsa/patterns/13-heaps/viz").then((m) => m.heapPushPop),
  "top-k-min-heap": () => import("@content/dsa/patterns/13-heaps/viz").then((m) => m.topK),
  "k-way-merge": () => import("@content/dsa/patterns/13-heaps/viz").then((m) => m.kWayMerge),
  "islands-dfs": () => import("@content/dsa/patterns/14-graph-traversal/viz").then((m) => m.islandsDfs),
  "bfs-levels": () => import("@content/dsa/patterns/14-graph-traversal/viz").then((m) => m.bfsLevels),
  "multi-source-bfs": () => import("@content/dsa/patterns/14-graph-traversal/viz").then((m) => m.multiSourceBfs),
  "kahn": () => import("@content/dsa/patterns/15-topological-sort/viz").then((m) => m.kahn),
  "dfs-colors": () => import("@content/dsa/patterns/15-topological-sort/viz").then((m) => m.dfsColors),
  "union-by-rank": () => import("@content/dsa/patterns/16-union-find/viz").then((m) => m.unionByRank),
  "path-compression": () => import("@content/dsa/patterns/16-union-find/viz").then((m) => m.pathCompression),
  "dijkstra-heap": () => import("@content/dsa/patterns/17-shortest-paths/viz").then((m) => m.dijkstraHeap),
  "bellman-ford-rounds": () => import("@content/dsa/patterns/17-shortest-paths/viz").then((m) => m.bellmanFordRounds),
  "combinations-tree": () => import("@content/dsa/patterns/18-backtracking/viz").then((m) => m.combinationsTree),
  "arrangements-used": () => import("@content/dsa/patterns/18-backtracking/viz").then((m) => m.arrangementsTree),
  "subset-sum-pruning": () => import("@content/dsa/patterns/18-backtracking/viz").then((m) => m.pruningTree),
  "assign-cookies": () => import("@content/dsa/patterns/19-greedy/viz").then((m) => m.assignCookies),
  "interval-scheduling": () => import("@content/dsa/patterns/19-greedy/viz").then((m) => m.activitySelection),
  "greedy-coins": () => import("@content/dsa/patterns/19-greedy/viz").then((m) => m.greedyCoins),
  "dp-recursion-tree": () => import("@content/dsa/patterns/20-dp-1d/viz").then((m) => m.recursionTree),
  "dp-fill-table": () => import("@content/dsa/patterns/20-dp-1d/viz").then((m) => m.fillTable),
  "dp-over-amount": () => import("@content/dsa/patterns/20-dp-1d/viz").then((m) => m.overAmount),
  "dp-lcs-table": () => import("@content/dsa/patterns/21-dp-2d/viz").then((m) => m.lcsTable),
  "dp-knapsack-table": () => import("@content/dsa/patterns/21-dp-2d/viz").then((m) => m.knapsackTable),
  "dp-knapsack-row": () => import("@content/dsa/patterns/21-dp-2d/viz").then((m) => m.knapsackRow),
  "xor-accumulate": () => import("@content/dsa/patterns/22-bit-manipulation/viz").then((m) => m.xorAccumulate),
  "popcount-kernighan": () => import("@content/dsa/patterns/22-bit-manipulation/viz").then((m) => m.popcountKernighan),
  "subset-masks": () => import("@content/dsa/patterns/22-bit-manipulation/viz").then((m) => m.subsetMasks),
  "lru-map-order": () => import("@content/dsa/patterns/23-design-data-structures/viz").then((m) => m.lruCache),
  "swap-and-pop": () => import("@content/dsa/patterns/23-design-data-structures/viz").then((m) => m.swapAndPop),
  "history-binary-search": () => import("@content/dsa/patterns/23-design-data-structures/viz").then((m) => m.historyLookup),
  "rotate-transpose-reverse": () => import("@content/dsa/patterns/24-matrix/viz").then((m) => m.rotateImage),
  "spiral-boundaries": () => import("@content/dsa/patterns/24-matrix/viz").then((m) => m.spiralBounds),
  "life-state-encoding": () => import("@content/dsa/patterns/24-matrix/viz").then((m) => m.lifeEncoding),
};

export const hasTrace = (id: string) => Object.hasOwn(TRACE_LOADERS, id);

/** The trace module's own spec (with its `run`), or undefined if the id is unknown. */
export async function loadTrace(id: string): Promise<TraceSpec | undefined> {
  return hasTrace(id) ? TRACE_LOADERS[id]() : undefined;
}
