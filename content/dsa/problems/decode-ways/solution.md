### Intuition

Look at the **last letter** of a decoding. It was made from either the final digit alone or the final two digits together, so

`ways[i] = (ways[i-1] if the last digit is a valid single letter) + (ways[i-2] if the last two digits are a valid pair)`

A single digit is valid when it is `1` to `9` (not `0`). A pair is valid when it is `10` to `26`, which excludes things like `06` or `27`. The empty prefix has one way (`ways[0] = 1`), which seeds the recurrence. This is the same shape as climbing stairs, with validity checks on each step.

### Step by step

1. `two = 1` (empty prefix) and `one = s[0] === "0" ? 0 : 1` (first character).
2. For `i` from `2` to `n`:
   1. `ways = 0`.
   2. If `s[i-1] !== "0"`, add `one`.
   3. If the number formed by `s[i-2]` and `s[i-1]` is between 10 and 26, add `two`.
   4. Slide: `two = one`, `one = ways`.
3. Return `one`.

### Dry run: `"226"`

| i | prefix | single (add `one`) | pair (add `two`) | ways |
|---|---|---|---|---|
| 0 | (empty) | | | 1 |
| 1 | `2` | | | 1 |
| 2 | `22` | `2` ok: +1 | `22` ok: +1 | 2 |
| 3 | `226` | `6` ok: +2 | `26` ok: +1 | **3** |

The three decodings are `2 2 6`, `22 6` and `2 26`.

### Edge cases

- A string starting with `0`, or a `0` not preceded by `1` or `2` (like `"30"`), cannot be decoded, and the count correctly falls to 0.
- `"10"` and `"20"` are valid only as pairs; the single-digit option fails on the `0` and the pair adds the way.
- `"27"` has one way: 27 is not a letter, so only `2 7`.

### Common mistakes

- Allowing pairs `01` to `09`; check that the numeric value is at least 10.
- Treating every `0` as an automatic failure for the whole string; it only blocks the single-digit option.
- Writing it recursively without memoization: exponential time.
