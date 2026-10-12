### Intuition

There is no sorted array here, yet this is a binary search problem. The trick is to search over the **answer** instead of over the input.

Try a speed `k`. Pile `p` takes `Math.ceil(p / k)` hours (a pile of 10 at speed 4 takes 3 hours: 4, 4, then 2 plus rest). Add those up and you know whether `k` is fast enough. Now notice:

> If speed `k` is fast enough, every speed above `k` is fast enough too.

So "is `k` fast enough?" answered for `k = 1, 2, 3, …` looks like `no, no, …, no, yes, yes, …`. It flips exactly once, and we want the first `yes`. That's the same shape as "first index with `nums[i] >= target`", so the same lower bound template finds it, with speeds playing the role of indices.

Trying every speed from 1 upwards would also work, but the largest pile can be a billion bananas. Binary search needs about 30 checks.

### Step by step

1. Write `hoursAt(k)`: the sum of `Math.ceil(p / k)` over all piles.
2. Set the search range of speeds:
   - `lo = 1`, the slowest possible speed.
   - `hi = Math.max(...piles)`: at that speed every pile takes exactly one hour, which always fits because `h >= piles.length`. Faster speeds never help, since an hour can't be shared between piles.
3. While `lo < hi`:
   1. `mid = Math.floor((lo + hi) / 2)`.
   2. If `hoursAt(mid) <= h`, `mid` works and maybe something slower does too: `hi = mid`.
   3. Otherwise `mid` is too slow, and so is everything slower: `lo = mid + 1`.
4. Return `lo`, the slowest speed that works.

### Dry run: `piles = [4, 9, 2, 7]`, `h = 6`

| lo | hi | mid | hours at mid | fits in 6? | decision |
|---|---|---|---|---|---|
| 1 | 9 | 5 | 1 + 2 + 1 + 2 = 6 | yes | `hi = 5` |
| 1 | 5 | 3 | 2 + 3 + 1 + 3 = 9 | no | `lo = 4` |
| 4 | 5 | 4 | 1 + 3 + 1 + 2 = 7 | no | `lo = 5` |
| 5 | 5 | | | | **return 5** |

### Why it works

The invariant is *the answer is in `[lo, hi]`*. At the start, `hi` is a speed that works and nothing below 1 exists. When `mid` works we keep it (`hi = mid`); when it fails, monotonicity says every slower speed fails too, so dropping `[lo, mid]` is safe. The range shrinks every step and ends on the first speed that works.

### Common mistakes

- Using `Math.floor(p / k)` or `p / k`: a pile of 10 at speed 4 takes 3 hours, not 2 or 2.5.
- Mixing templates: `while (lo <= hi)` together with `hi = mid`. Once `lo === hi`, `mid` equals both, `hi = mid` changes nothing, and the loop never ends. With `hi = mid`, the condition must be `lo < hi`.
- Setting `hi` to the sum of the piles: still correct, but it can be up to 10^13 and costs extra steps for nothing.
- Writing `hi = mid - 1` when `mid` works: if `mid` was the answer, it's gone.
