### Intuition

Comparing every word with every other word is O(n²) comparisons. Instead, give every word a **key** with one property: two words get the same key exactly when they are anagrams. Then grouping is just a hash map from key to a list of words.

Sorting a word's letters is such a key: anagrams contain the same letters, so sorted they become the same string. `"listen"`, `"silent"` and `"enlist"` all sort to `"eilnst"`; `"google"` sorts to `"eggloo"`.

### Step by step

1. Create an empty `Map` called `groups` (key → array of words).
2. For each `word` in `strs`:
   1. Build its key: `[...word].sort().join('')`.
   2. If the key is new, start an empty array for it.
   3. Push `word` onto that array.
3. Return the arrays: `[...groups.values()]`.

### Dry run: `["abc", "bca", "xyz", "cab", "zyx", "q"]`

| word | key | groups after this word |
|---|---|---|
| abc | abc | abc: [abc] |
| bca | abc | abc: [abc, bca] |
| xyz | xyz | abc: [abc, bca], xyz: [xyz] |
| cab | abc | abc: [abc, bca, cab], xyz: [xyz] |
| zyx | xyz | abc: [abc, bca, cab], xyz: [xyz, zyx] |
| q | q | …, q: [q] |

Result: `[["abc", "bca", "cab"], ["xyz", "zyx"], ["q"]]`.

### Why it works

Two words are anagrams exactly when they have the same multiset of letters, and sorting is a canonical way to write a multiset down: same letters, same counts, same sorted string. So the key never merges non-anagrams and never splits anagrams.

### Edge cases

- The empty string has the key `""` and forms its own group; two empty strings share it.
- Duplicate words go into the same group, once per copy.
- A single word gives a single group with one member.

### Common mistakes

- Keys that collide: the **sum** of character codes gives `"ac"` and `"bb"` the same key (196), and the **set** of letters gives `"aab"` and `"abb"` the same key.
- Using the sorted **array** as the key: arrays are compared by reference, so every word starts a new group. Join it into a string.
- Building the count key without a separator: counts `[1, 11, …]` and `[11, 1, …]` both print as `"111…"`. Join with `'#'`.

### Other ways to solve it

- **Count signature key**: count the 26 letters and use `counts.join('#')` as the key. That's O(k) per word instead of O(k log k), so O(n · k) overall: better for long words.
