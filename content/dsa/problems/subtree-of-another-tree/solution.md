### Intuition

A subtree match has to begin at *some* node of `root`. So try every node as a candidate starting point, and for each one ask the simpler question you already know how to answer: **is the tree rooted here identical to `subRoot`?** That is the Same Tree check.

The candidates are visited with an ordinary DFS: the answer is true if the match starts at the current node, or somewhere in the left subtree, or somewhere in the right subtree.

### Step by step

1. Write `same(a, b)`: both `null` is true, exactly one `null` is false, otherwise the values are equal and `same` holds for both pairs of children.
2. Write `isSubtree(root, subRoot)`:
   1. If `root` is `null`, return `false`.
   2. If `same(root, subRoot)`, return `true`.
   3. Otherwise return `isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot)`.

### Dry run: `root = [3, 4, 5, 1, 2]`, `subRoot = [4, 1, 2]`

| node tried | `same(node, subRoot)` | decision |
|---|---|---|
| 3 | values 3 vs 4 differ: false | try children |
| 4 | 4=4, then 1=1 and 2=2, all leaves end together: **true** | return true |

The search never has to look at 5.

### Edge cases

- `subRoot` equal to the whole `root`: the first check succeeds.
- A node whose value matches but whose subtree is bigger: `same` fails because one side still has a child when the other ends. That is why comparing only the node value and its immediate children is not enough.
- Repeated values (a chain of 1s): several candidates start with the right value; only `same` decides.

### Common mistakes

- Treating a match on the node's value alone as success.
- Letting a successful `same` on a *child* position count without having compared the whole subtree below it.
- Forgetting the `root === null` base case, which recurses on `null.left`.

### Other ways to solve it

**Serialize both trees** with explicit null markers (for example `(3 (4 (1 # #) (2 # #)) ...)`) with delimiters around each value, then check whether the sub-string appears. It is O(n + m) with a linear-time substring search, but the null markers and delimiters are essential: without delimiters the text for a node 2 would match inside the text for a node 12, and without null markers different shapes can look alike.
