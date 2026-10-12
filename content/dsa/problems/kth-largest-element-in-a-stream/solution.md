### Intuition

The obvious approach keeps every score in a sorted array and reads position `k - 1` from the top. Inserting into a sorted array shifts elements, so each `add` costs O(n), and the array keeps growing.

The key observation: **once a score falls out of the top k, it can never come back.** New scores only add competition, so the kth place can only move up or stay put. A score that is already beaten by k others will be beaten by at least k others forever.

So keep only the k largest scores. Among those k, the one we report is the **smallest**: that's exactly what a **min-heap** gives in O(1). When a new score arrives, push it; if the heap now holds k + 1 scores, pop the smallest, because it has just dropped to (k + 1)th place.

### Step by step

1. Write a small binary heap with a comparator (`push`, `pop`, `peek`, `size`). With `(a, b) => a - b` it is a min-heap: the smallest value sits at the top.
2. In the constructor, store `k`, create the empty min-heap, and run every value of `nums` through `add` (ignore the return value).
3. In `add(val)`:
   1. Push `val`.
   2. If the heap holds more than `k` values, pop once. The value removed is the smallest of k + 1, so it is not in the top k.
   3. Return `peek()`: the smallest of the k largest values, which is the kth largest.

### Dry run: `k = 3`, `nums = [7, 1, 9, 4]`, then `add` 5, 2, 8, 10, 6

The heap column lists the values in sorted order for readability (the array inside the heap is ordered differently).

| call | after push | size > 3? | heap afterwards | returns |
|---|---|---|---|---|
| constructor: 7, 1, 9 | 1, 7, 9 | no | 1, 7, 9 | |
| constructor: 4 | 1, 4, 7, 9 | yes, pop 1 | 4, 7, 9 | |
| `add(5)` | 4, 5, 7, 9 | yes, pop 4 | 5, 7, 9 | **5** |
| `add(2)` | 2, 5, 7, 9 | yes, pop 2 | 5, 7, 9 | **5** |
| `add(8)` | 5, 7, 8, 9 | yes, pop 5 | 7, 8, 9 | **7** |
| `add(10)` | 7, 8, 9, 10 | yes, pop 7 | 8, 9, 10 | **8** |
| `add(6)` | 6, 8, 9, 10 | yes, pop 6 | 8, 9, 10 | **8** |

Notice `add(2)` and `add(6)`: the new value is pushed and immediately popped again, because it is too small to enter the top 3.

### Why it works

After every call the heap holds exactly the `k` largest values seen so far (or all of them, if fewer than `k` have arrived). Pushing a value and popping the minimum of the `k + 1` keeps that true, because the popped value has `k` values above it. The smallest value in the heap therefore has exactly `k - 1` stored values above it: it is the kth largest.

### Edge cases

- The constructor may receive fewer than `k` values, or none. The heap just holds what it has; the problem guarantees at least `k` values exist by the time `add` returns.
- Duplicates are separate entries: with `k = 2` and scores `4, 4, 4`, the heap holds `4, 4` and the answer is `4`.
- `k = 1` turns the class into "largest value so far".

### Common mistakes

- Keeping **all** values in a **max-heap** and popping `k - 1` times to read the answer: that costs O(k log n) per call and destroys the heap unless you push everything back.
- Popping **before** pushing when the heap is full. If the new value is smaller than the top, you have just thrown away a genuine top-k value. Either push then pop, or only replace the top when `val > peek()`.
- Flipping the comparator: `(a, b) => b - a` makes a max-heap, which would keep the k **smallest** values.
- Re-sorting an array on every `add`: correct, but O(n log n) per call times up to 10^4 calls is far too slow.
