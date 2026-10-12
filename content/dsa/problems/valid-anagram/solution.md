### Intuition

Order doesn't matter for an anagram, only **how many times each letter appears**. So build that tally for both strings and compare. Sorting both strings and comparing them also works, but it costs O(n log n); counting is O(n).

A neat trick avoids two separate tallies: walk both strings together, adding 1 for each letter of `s` and subtracting 1 for each letter of `t`. If every counter ends at 0, each letter was supplied by `s` exactly as often as `t` used it.

With only lowercase letters, an array of 26 counters is the hash map: the letter `ch` lives at index `ch.charCodeAt(0) - 97` (97 is the code of `'a'`).

### Step by step

1. If `s.length !== t.length`, return `false`: different lengths can't have the same letter counts.
2. Create `count = new Array(26).fill(0)`.
3. For each index `i`:
   - Increase the counter of `s[i]`.
   - Decrease the counter of `t[i]`.
4. Return `true` if every counter is 0, otherwise `false`.

### Dry run: `s = "aacc"`, `t = "ccac"`

| i | s[i] | t[i] | count of a | count of c |
|---|---|---|---|---|
| 0 | a | c | 1 | -1 |
| 1 | a | c | 2 | -2 |
| 2 | c | a | 1 | -1 |
| 3 | c | c | 1 | -1 |

The counters end at a = 1 and c = -1, not all zero: `s` has one more `a` and one fewer `c` than `t`. Answer: `false`.

### Why it works

After the loop, `count[x]` equals (copies of `x` in `s`) minus (copies of `x` in `t`). All counters are zero exactly when every letter appears equally often in both strings, which is the definition of an anagram.

### Common mistakes

- Comparing only **which** letters appear: `"aacc"` and `"ccac"` use the same set of letters but different counts.
- Skipping the length check when your loop only walks `s`: extra letters at the end of `t` are never looked at.
- Sorting with `s.split('').sort().join('')` is correct but O(n log n). Mention it, then offer counting.

### Other ways to solve it

- **Map instead of an array**: `count.set(ch, (count.get(ch) ?? 0) + 1)`. Use it when the input can contain any Unicode character (and iterate with `for...of` so characters outside the basic plane aren't split in two).
- **Sort and compare**: O(n log n) time, O(n) space for the arrays.
