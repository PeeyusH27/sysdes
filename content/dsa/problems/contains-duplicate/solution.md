### Intuition

The brute force compares every pair of elements, which is O(n²). The only thing you ever need to know about an earlier element is **"have I seen this value before?"**. That is a membership question, and a hash set answers it in O(1) on average.

As soon as the current value is already in the set, you have found two equal elements and can stop. If you reach the end without that happening, all values are different.

### Step by step

1. Create an empty set `seen`.
2. For each value `x` in `nums`, from left to right:
   1. If `seen` already contains `x`, return `true`.
   2. Otherwise add `x` to `seen`.
3. After the loop, return `false`.

### Dry run: `[3, 1, 4, 1, 5]`

| x | in `seen` before? | `seen` after |
|---|---|---|
| 3 | no | {3} |
| 1 | no | {3, 1} |
| 4 | no | {3, 1, 4} |
| 1 | **yes** | return `true` |

### Edge cases

- A single element can never be a duplicate, so the loop finishes and returns `false`.
- Check *before* adding. If you add first and then test, every value looks like a duplicate of itself.
- Negative numbers and zero need no special handling in a `Set`.

### Common mistakes

- Using an object as the set and forgetting that its keys are strings: `{1: true}` and `"1"` collide, and `__proto__`-style keys misbehave. A `Set` keeps numbers as numbers.
- Comparing `nums.length` with `new Set(nums).size` is correct and short, but it always builds the full set. The early-exit loop is faster when a duplicate appears near the start.

### Other ways to solve it

**Sort first**: after sorting, equal values sit next to each other, so one scan comparing neighbours finds any duplicate. O(n log n) time, but O(1) extra space if you may reorder the input.
