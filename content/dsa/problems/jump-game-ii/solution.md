### Intuition

Think of the jumps in **rounds**, like breadth-first search:

- With 0 jumps you stand on index 0.
- With 1 jump you can stand on any index from 1 up to `nums[0]`.
- With 2 jumps you can stand anywhere up to the furthest point reachable from that first range, and so on.

Each round's reachable indices form one contiguous block that starts right after the previous block, because a jump can always be shorter. So you don't need a queue. Scan left to right, and while you walk through the current block, record the furthest index any of its indices can jump to. When you reach the end of the block, you have to take another jump, and the next block ends at that furthest index. Count the blocks until one covers the last index.

### Step by step

1. Set `jumps = 0`, `end = 0` (the last index reachable with `jumps` jumps) and `farthest = 0`.
2. For `i` from 0 to `nums.length - 2`:
   1. `farthest = Math.max(farthest, i + nums[i])`.
   2. If `i === end`, the current block is fully scanned: `jumps++` and `end = farthest`.
3. Return `jumps`.

The loop stops one short of the last index: once you can stand there, no further jump is needed. Scanning it too would count an extra jump whenever a block happens to end exactly on it.

### Dry run: `nums = [2, 4, 1, 1, 1, 1]`

| i | nums[i] | farthest | i === end? | jumps | end |
|---|---|---|---|---|---|
| 0 | 2 | 2 | yes | 1 | 2 |
| 1 | 4 | 5 | no | 1 | 2 |
| 2 | 1 | 5 | yes | 2 | 5 |
| 3 | 1 | 5 | no | 2 | 5 |
| 4 | 1 | 5 | no | 2 | 5 |

The answer is 2: index 0 → index 1 → index 5.

### Why it works

After `k` jumps, the block `end` describes is exactly the set of indices reachable in at most `k` jumps (the BFS level argument). The greedy never commits to a specific landing index; it only tracks how far the next round can get, so it can't fall behind any other strategy. That's the "greedy stays ahead" proof: after every round, its frontier is at least as far as anyone's.

### Common mistakes

- Always jumping as far as possible from where you stand. In `[2, 4, 1, 1, 1, 1]`, the longest first jump lands on index 2 and then needs 3 more jumps; hopping to the 4 at index 1 first needs only 2 in total.
- Looping to the last index inclusive, which can count one jump too many.
- Running a BFS that pushes every index each node can reach: correct, but it can cost O(n · max jump).

### Other ways to solve it

A DP where `dp[i]` is the fewest jumps to reach `i`, filled by trying every earlier index that can reach `i`, works in O(n²). An explicit BFS with a queue gives the same levels as the greedy scan, with more bookkeeping.
