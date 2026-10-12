### Intuition

Build a permutation one position at a time. For the first position any of the `n` numbers can go; for the second, any of the `n - 1` that are left; and so on. That is a recursion tree with `n!` leaves, and backtracking walks it with one shared `path`.

The difference from subsets: **order matters**, so `[5, 4, 6]` and `[4, 5, 6]` are both answers. There is no start index; every call loops over **all** of `nums` and skips the numbers already in the path. A boolean array `used` answers "is `nums[i]` already placed?" in O(1).

### Step by step

1. Create `result = []`, `path = []` and `used = new Array(n).fill(false)`.
2. Define `backtrack()`:
   1. If `path.length === n`, push a copy of `path` into `result` and return.
   2. For each `i` from `0` to `n - 1`:
      - if `used[i]`, skip it;
      - choose: set `used[i] = true` and push `nums[i]`;
      - explore: call `backtrack()`;
      - un-choose: pop, and set `used[i] = false`.
3. Call `backtrack()` and return `result`.

The tree for `[4, 5, 6]`:

```
[]
├── 4 ── 4,5 ── 4,5,6
│    └── 4,6 ── 4,6,5
├── 5 ── 5,4 ── 5,4,6
│    └── 5,6 ── 5,6,4
└── 6 ── 6,4 ── 6,4,5
     └── 6,5 ── 6,5,4
```

### Dry run: `nums = [4, 5, 6]` (the branch that starts with 4)

| step | path | used | action |
|---|---|---|---|
| 1 | [] | F F F | choose 4 |
| 2 | [4] | T F F | skip 4 (used), choose 5 |
| 3 | [4, 5] | T T F | skip 4 and 5, choose 6 |
| 4 | [4, 5, 6] | T T T | full: record **[4, 5, 6]**, return |
| 5 | [4, 5] | T T F | un-choose 6; loop ends, return |
| 6 | [4] | T F F | un-choose 5, choose 6 |
| 7 | [4, 6] | T F T | choose 5 |
| 8 | [4, 6, 5] | T T T | full: record **[4, 6, 5]** |
| 9 | [] | F F F | after un-choosing everything, choose 5 and repeat |

The branches starting with 5 and with 6 run the same way, for 6 permutations in total.

### Why it works

At depth `d` the path holds `d` distinct numbers, and the loop offers every number not yet used, so each of the `n!` orderings corresponds to exactly one root-to-leaf path. Un-choosing restores both `path` and `used` exactly, so sibling branches start from the same state.

### Common mistakes

- Reusing the subsets loop with a start index: it only produces numbers in their original order, so you get one permutation instead of `n!`.
- Forgetting `used[i] = false` after the recursive call: later branches think the number is still taken.
- Pushing `path` without copying it.
- Using `path.includes(nums[i])` instead of `used`: correct here, but O(n) per check, and it breaks as soon as values can repeat.

### Other ways to solve it

- **Swap in place**: for position `pos`, swap each `nums[i]` with `i >= pos` into `pos`, recurse on `pos + 1`, and swap back. No `used` array and no `path`; record a copy of `nums` when `pos === n`.
- **Insertion**: the permutations of `n` numbers are the permutations of the first `n - 1` with the last number inserted into every gap.
