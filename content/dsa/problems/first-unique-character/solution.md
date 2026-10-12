### Intuition

The brute force checks each character against the whole string: O(n²). The slow part is "how many times does this character appear?", and that question has the same answer every time you ask it for the same letter. So **count once, up front**, then use the counts.

The answer depends on position ("the **first** unique character"), so the second pass must walk the string in its original order, not the map.

### Step by step

1. First pass: build a frequency map `count` from character to number of occurrences.
2. Second pass: for each index `i` from left to right, if `count.get(s[i]) === 1`, return `i`.
3. If the second pass finds nothing, return `-1`.

### Dry run: `s = "swiss"`

First pass: `s → 3`, `w → 1`, `i → 1`.

| i | s[i] | count | unique? |
|---|---|---|---|
| 0 | s | 3 | no |
| 1 | w | 1 | **yes → return 1** |

The `i` at index 2 is unique too, but `w` comes first.

### Edge cases

- A single character is unique: `"z"` returns `0`.
- Every character repeats: `"abab"` returns `-1`.
- The unique character can be the very last one: `"aabbccd"` returns `6`.

### Common mistakes

- Returning the first key of the map whose count is 1. A `Map` keeps **insertion** order, which happens to match first appearance here, but a plain object reorders integer-like keys, and the habit breaks as soon as the keys aren't single letters. Walking `s` is always correct.
- Using `s.indexOf(ch) === s.lastIndexOf(ch)` for every character: correct, but each call scans the string, so it's O(n²) in general.
- Returning the character instead of its index.

### Other ways to solve it

- **Array of 26 counters** instead of a `Map`: `count[s.charCodeAt(i) - 97]++`. Same O(n) time, smaller constant.
- **One pass over the string, one over the alphabet**: store each letter's first index and whether it repeats, then take the smallest first index among non-repeating letters. Useful when `s` is a huge stream you can only read once.
