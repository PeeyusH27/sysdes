### Intuition

Two things can happen to the sequence: it reaches 1, or it repeats a number and goes round a loop forever. It can't grow without limit: a number with `d` digits maps to at most `81 × d`, which is smaller than the number itself once it has 4 or more digits, so the sequence soon drops below 1000 and stays there.

So this is **cycle detection on an implicit linked list**: each number is a node, and its `next` is its digit-square sum. The walk from `n` always ends in a loop, because even 1 loops onto itself (`1 → 1`). Run Floyd's slow and fast pointers along the sequence: they are guaranteed to meet inside the loop, and `n` is happy exactly when that loop is 1's self-loop.

### Step by step

1. Write a helper `next(x)` that sums the squares of the digits of `x`: add `(x % 10)²`, then `x = Math.floor(x / 10)`, until `x` is 0.
2. `slow = n` and `fast = next(n)`, so the pointers start apart.
3. While `fast !== 1` and `slow !== fast`:
   - `slow = next(slow)` (one step),
   - `fast = next(next(fast))` (two steps).
4. Return `fast === 1`.

### Dry run: `n = 2`

The sequence is 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 → … (a loop of 8 numbers that never visits 1).

| step | slow | fast |
|---|---|---|
| start | 2 | 4 |
| 1 | 4 | 37 |
| 2 | 16 | 89 |
| 3 | 37 | 42 |
| 4 | 58 | 4 |
| 5 | 89 | 37 |
| 6 | 145 | 89 |
| 7 | 42 | 42 |

They meet on 42, not on 1, so 2 is not happy. For a happy number like 19 (19 → 82 → 68 → 100 → 1), `fast` reaches 1 first and stays there.

### Why it works

Every sequence ends in a loop, and Floyd's pointers always meet inside it. If the loop is `1 → 1`, `fast` reaches 1 and the loop condition stops it. Otherwise they meet on a number that isn't 1, and since 1 is not in that loop, the sequence can never reach 1.

### Common mistakes

- `while (n !== 1) n = next(n)` with no cycle check: unhappy numbers loop forever and the test times out.
- `x / 10` without `Math.floor`: JavaScript division gives fractions, so the "digits" become decimals and the sums are wrong.
- Starting `slow` and `fast` on the same number and checking `slow === fast` before moving: the loop exits immediately.

### Other ways to solve it

Keep a `Set` of the numbers seen so far and stop at 1 or at a repeat. The numbers stay small, so this is fast in practice, at the cost of memory for the set. (It is also known that every unhappy sequence passes through 4, so `while (n !== 1 && n !== 4)` works, but that is a memorised fact rather than a reason.)
