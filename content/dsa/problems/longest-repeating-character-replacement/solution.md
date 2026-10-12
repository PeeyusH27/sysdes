### Intuition

Look at one fixed substring. To turn it into a single repeated letter as cheaply as possible, **keep its most common letter** and replace everything else. The cost is

`replacements = window length - count of the most common letter`

and the substring is achievable when that cost is at most `k`.

Validity is monotonic, which is what a sliding window needs: removing a character from the left of a valid window shrinks its length by 1 and the top count by at most 1, so the cost never goes up. Shrinking a valid window keeps it valid. So use the **longest valid window** template: grow `right`, and while the window costs more than `k`, move `left` forward.

### Step by step

1. Keep `count`, an array of 26 letter counts for the current window, plus `left = 0` and `best = 0`.
2. For each `right`:
   1. Increase the count of `s[right]`.
   2. While `(right - left + 1) - Math.max(...count) > k`, decrease the count of `s[left]` and increase `left`.
   3. Update `best = Math.max(best, right - left + 1)`.
3. Return `best`.

### Dry run: `s = "ABBBCB"`, `k = 1`

| right | char | counts A, B, C | window | length - top count | action | best |
|---|---|---|---|---|---|---|
| 0 | A | 1, 0, 0 | A | 1 - 1 = 0 | ok | 1 |
| 1 | B | 1, 1, 0 | AB | 2 - 1 = 1 | ok | 2 |
| 2 | B | 1, 2, 0 | ABB | 3 - 2 = 1 | ok | 3 |
| 3 | B | 1, 3, 0 | ABBB | 4 - 3 = 1 | ok | 4 |
| 4 | C | 1, 3, 1 | ABBBC | 5 - 3 = 2 | too many: drop A → BBBC (4 - 3 = 1) | 4 |
| 5 | B | 0, 4, 1 | BBBCB | 5 - 4 = 1 | ok | **5** |

Answer: `5` (replace the C to get BBBBB).

### Edge cases

- `k = 0`: the answer is the longest run of one letter that already exists.
- `k >= s.length - 1`: every window is valid, so the answer is the whole length.
- A single character always gives 1.

### Common mistakes

- Thinking the kept letter must be the first or last letter of the window. It must be the **most frequent** one, wherever it is.
- Counting **distinct** other letters instead of other characters: in `"AABBB"` only one other letter (A) appears, but it appears twice, so making the window all B costs 2 replacements, not 1.
- Forgetting to decrease the count of the letter that leaves when `left` moves.

### Other ways to solve it

- **Never-shrinking window**: many solutions keep `maxFreq`, the highest count seen in **any** window so far, and never lower it, using `if` instead of `while`. The window then only grows or slides by one, and it can only grow when some letter reaches a new record count, so the final length is still correct. It skips the 26-letter scan, but the argument is subtle; the version above is easier to explain and still O(26 · n) = O(n).
