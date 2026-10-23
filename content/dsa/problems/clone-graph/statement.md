In a connected, undirected graph each node is an object with a number `val` and a list `neighbors` that holds the node objects it is connected to. Your job is to make a **deep copy**: a brand-new graph with the same values and the same connections, in which **no node object is shared** with the original (every `neighbors` list must point at copies, never at original nodes).

```js
class Node {
  constructor(val, neighbors = []) { this.val = val; this.neighbors = neighbors; }
}
```

The tests describe a graph with an adjacency list `adjList`: node `i + 1` has the neighbours `adjList[i]`, listed in that order, and node 1 is the entry point. An empty `adjList` is an empty graph. Your function `cloneGraph(adjList)` should

1. build the original `Node` graph from `adjList`,
2. deep-copy it, starting from node 1, and
3. return the adjacency list of the **copy** in the same format (the neighbour order must be preserved).

In JavaScript the starter provides `Node`, `buildGraph` (step 1) and `toAdjList` (step 3), and checks that you did not simply return the original: you only write `cloneNode(node)`. In Python, define a small `Node` class and those two steps yourself. Only the returned adjacency list is compared by the tests, but the copy must be a real deep copy.

### Constraints

- `0 <= number of nodes <= 100`
- Node values are `1..n` and distinct; there are no self-loops or repeated edges.
- The graph is connected, and edges are undirected: if `b` is in the list of `a`, then `a` is in the list of `b`.
