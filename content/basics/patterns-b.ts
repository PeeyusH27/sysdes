import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "graph-traversal": {
    what: "A graph is things joined by links, like rooms and doors, or grid cells and their neighbours. Traversal visits every reachable thing once, using a visited mark. DFS dives deep first. BFS spreads outward in rings.",
    why: "Grids and maps are full of loops, so without a visited mark you circle forever. With one, each cell is handled once, so work grows with cells plus links. BFS also gives the fewest steps for free.",
    example: "Rot spreading through a crate of oranges. Each orange is a node and each touching pair is an edge. Every minute the rot reaches the next ring of neighbours. Counting the rings counts the minutes.",
    when: "Use it for a grid or network with words like islands, regions, connected, fewest steps, or spreads each minute. If steps have different costs, use shortest paths instead.",
  },
  "topological-sort": {
    what: "Put tasks in a line so each task comes after everything it depends on. The dependencies form a directed graph, meaning arrows from one task to another. Such a line exists only if no arrows loop back.",
    why: "Guessing an order and checking it is slow. Repeatedly taking a task with nothing left before it builds a valid order in one pass over all tasks and arrows. It also tells you when a cycle makes it impossible.",
    example: "Getting dressed. Socks go before shoes, shirt before jacket. Each item is a node, each before-rule an arrow. Pick anything nothing points at, cross it off, repeat. If socks needed shoes and shoes needed socks, you are stuck.",
    when: "Use it for prerequisites, build order, or can all tasks be finished. Also for the fewest rounds when independent tasks run in parallel. It needs arrows with a direction.",
  },
  "union-find": {
    what: "Union-find tracks which items belong to the same group. Each group has one leader. To check if two items are together, compare their leaders. To merge two groups, make one leader follow the other.",
    why: "Re-running a search after every new link is slow. Union-find answers same group? and merges in almost constant time, thanks to two tricks that keep the chains short. Without them a chain can grow to O(n).",
    example: "Friend circles at a party. Each person points to a friend, and following friends ends at the circle's leader. Two people are in one circle if their leaders match. Introducing two circles makes one leader follow the other.",
    when: "Use it to count groups, when links arrive one at a time, or to ask if an edge closes a cycle in an undirected graph. Not for directed cycles.",
  },
  "shortest-paths": {
    what: "Find the cheapest route from a start to other places when each link has a cost. Keep a best-known cost for every place and lower it whenever a route through a neighbour is cheaper. The algorithms differ in visiting order.",
    why: "Trying every route blows up as the map grows. Visiting the closest place next settles each cost for good, so Dijkstra needs only about links times log of places, not one step per route.",
    example: "A road trip. Towns are nodes, roads are edges, and the cost is minutes or tolls. Each town carries a sign: cheapest known cost to get here. You always drive to the town with the smallest sign next.",
    when: "Use it for minimum cost, time or effort, weighted edges, or at most k stops. Equal costs on every step mean plain BFS. Negative costs rule out Dijkstra, so use Bellman-Ford.",
  },
  backtracking: {
    what: "Build an answer one choice at a time. Make a choice, explore what follows, then undo it and try the next. A dead end just means stepping back to the last fork. It is how you list every possible answer.",
    why: "Brute force restarts for every combination. Backtracking shares one growing path and drops a whole branch the moment it cannot work. It stays exponential, so it suits small inputs, around n up to 10.",
    example: "A maze and a ball of string. At each fork you pick a corridor and unroll string. At a dead end you wind it back and try the next corridor. Forks are choices, the string is your current path.",
    when: "Use it when asked for all subsets, permutations or every valid arrangement, or to place items under rules like queens. Limits are small. For one best value with repeated work, try DP.",
  },
  greedy: {
    what: "Greedy takes the best-looking choice at each step and never undoes it. Usually you sort first, then make one pass. It is only correct when you can show the choice never hurts later.",
    why: "Trying every combination is far too slow for 100,000 items. Greedy needs just a sort and one pass, about O(n log n). The catch is that a wrong rule gives a wrong answer, so test it on tiny cases.",
    example: "Handing out cookies to children. Each wants a cookie of at least some size. Give the smallest cookie that works to the least demanding child. A bigger cookie cannot do better there and may be needed later.",
    when: "Use it for max or min questions with a natural rule: earliest deadline, cheapest so far, furthest reach. Also can you reach the end. If a small counterexample breaks the rule, use dynamic programming.",
  },
  "dp-1d": {
    what: "Dynamic programming solves a big problem from smaller ones and writes each answer down once. Say what dp[i] means, how it comes from earlier cells, then fill a table in order. It is recursion that never repeats itself.",
    why: "Plain recursion asks the same question again and again, so time explodes as n grows. Climbing stairs has only n + 1 different questions. Answering each once turns the blow-up into one loop of n steps.",
    example: "Climbing a staircase with a toll on each step, moving one or two steps at a time. You reached step i from i - 1 or i - 2, so its cheapest cost is the cheaper of those two. Jot each on a sticky note.",
    when: "Use it for the number of ways, the minimum or maximum, or is it possible, when brute force repeats the same calls. Listing every answer is backtracking. If a greedy rule is provably right, prefer it.",
  },
  "dp-2d": {
    what: "The same idea as 1D dynamic programming, with a table of rows and columns. A cell answers a question about two things at once: a grid position, a prefix of each of two words, or the first i items with c space left.",
    why: "Comparing two strings or crossing a grid by brute force tries exponentially many options. The table has only rows times columns cells, each filled from neighbours already done. Two 100 letter words need 10,000 cells.",
    example: "Turning the word cat into cart. Rows are letters of cat, columns are letters of cart. Each cell holds the fewest edits between the first i letters and the first j. Matching last letters copy a neighbour.",
    when: "Use it with two strings (common subsequence, edit distance), a grid crossed only right and down, or choosing items within a budget. If one index describes the state, 1D is enough.",
  },
  "bit-manipulation": {
    what: "A number is stored as a row of on-off switches called bits. Bit tricks work on the whole row in one step. XOR cancels equal pairs, a mask checks one switch, and n & (n - 1) switches off the lowest one.",
    why: "Finding the odd one out normally needs a hash map and extra memory. XOR over the list does it in O(n) time and O(1) memory, meaning no extra storage. Counting 1 bits with n & (n - 1) takes one step per 1.",
    example: "A pile of socks where every pair matches except one. Pairing matching socks removes them, so only the odd sock is left. XOR does the same: x XOR x is 0 and x XOR 0 is x, so all pairs vanish.",
    when: "Use it when every element appears twice except one, to count set bits or test a power of two, to add without + or -, or to list subsets of up to about 20 items.",
  },
  "design-data-structures": {
    what: "Design questions ask you to build a class whose every method is fast. No single structure does it alone, so you pair them: a map to find things instantly, plus a list or sorted buckets to keep the order you need.",
    why: "A map finds a key in O(1), constant time, but remembers no order. A list keeps order but needs O(n) to find anything. Scanning on every call is too slow, so pairing gives each method O(1) or O(log n).",
    example: "A library desk with room for ten books. A card catalogue finds any book at once. A row ordered by last borrowed shows which to remove when full. Catalogue plus ordered row is an LRU cache.",
    when: "Use it when the statement says design a class with methods like get, put, insert and remove, each in O(1). Also for evicting the least recently used, past values at time t, or a random member.",
  },
  matrix: {
    what: "A matrix is a grid of rows and columns. Grid problems are mostly coordinate arithmetic: where does cell (i, j) go after a rotation, or which cells does a spiral visit? Get the formula right and the code follows.",
    why: "Copying the grid is easy but costs O(rows × columns) extra memory. Index formulas let you rotate or mark cells inside the same grid, so extra space is O(1). Time stays one visit per cell.",
    example: "Turning a printed photo a quarter turn. Pixels are cells. Flip it along its diagonal, then mirror each row, and the photo has rotated clockwise. No second photo is needed.",
    when: "Use it when asked to rotate, transpose, spiral or walk diagonals, to update in place with O(1) extra space, or when every cell changes at once. Test 1 by n shapes.",
  },
};
