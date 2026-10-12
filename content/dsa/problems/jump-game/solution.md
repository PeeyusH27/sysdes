### Intuition

Trying every sequence of jumps explodes exponentially, and a "jump as far as you can" rule fails: in `[2, 5, 0, 0]`, the longest first jump lands on a `0` and gets stuck, but a jump of 1 reaches the 5, which goes all the way.

The trick is to stop thinking about **which** jumps to make. Ask only: *what is the furthest index I could possibly reach?*

The reachable indices always form a prefix `0 … reach`. If you can jump from `i` to some index `j`, you can also jump from `i` to anything between them, because jumps may be shorter than the maximum. So scan left to right, keeping `reach`. Every index up to `reach` is reachable, and each one may push `reach` further. If the scan ever arrives at an index beyond `reach`, there is a gap nothing can cross.

### Step by step

1. Set `reach = 0`.
2. For each index `i` from left to right:
   1. If `i > reach`, index `i` is unreachable: return `false`.
   2. Otherwise update `reach = Math.max(reach, i + nums[i])`.
   3. If `reach >= nums.length - 1`, the last index is reachable: return `true`.
3. Return `true` (only happens when the loop ends on its own).

### Dry run: `nums = [1, 1, 0, 2, 4]`

| i | nums[i] | i ≤ reach? | reach after |
|---|---|---|---|
| 0 | 1 | 0 ≤ 0: yes | 1 |
| 1 | 1 | 1 ≤ 1: yes | 2 |
| 2 | 0 | 2 ≤ 2: yes | 2 (stuck at the 0) |
| 3 | 2 | 3 > 2: **no** | return `false` |

With `[2, 0, 3, 0, 1]`: index 0 sets `reach = 2`, index 1 adds nothing, index 2 sets `reach = 5`, which is past the last index, so the answer is `true`.

### Why it works

The invariant is *every index `<= reach` is reachable, and no index beyond it has been shown reachable yet*. Each reachable index extends `reach` by its own jump, and nothing else can extend it. When `i` passes `reach`, no reachable index can jump to `i` or beyond, so the end is unreachable. This is the "greedy stays ahead" style of argument: you never commit to a path, you just keep the best frontier.

### Common mistakes

- Always taking the longest jump from where you stand: `[2, 5, 0, 0]` gets stuck on a 0.
- Treating every 0 as a dead end: a 0 only matters if nothing before it can jump over it, as in `[4, 0, 0, 0, 0]`, which is reachable.
- Exploring all paths with recursion and no memo: exponential time.

### Other ways to solve it

Work backwards: let `goal = n - 1`, and for `i` from `n - 2` down to 0, if `i + nums[i] >= goal`, move the goal to `i`. The answer is `goal === 0`. A DP that marks each index good or bad by checking every index it can jump to also works, but it is O(n²).
