### Intuition

For every word you need the **shortest root that is a prefix of it**. Testing every root against every word with `startsWith` costs O(number of roots × length) per word.

Put the roots in a **trie** instead. Walking a word down the trie passes through exactly the nodes for that word's prefixes, shortest first. So:

- the **first** node on the path marked as the end of a root is the shortest root that matches;
- if the path breaks off before any marked node, no root matches and the word stays.

Either way the walk stops early, often after just a few letters.

### Step by step

1. Build a trie of the roots: insert each one and mark its last node.
2. For each word of the sentence (split on spaces):
   1. Start at the trie's root node.
   2. For each letter, move to the matching child. If there is none, keep the word unchanged.
   3. If the node you just reached is marked, replace the word with its first `i + 1` letters and stop.
   4. If you reach the end of the word without a marked node, keep the word.
3. Join the words back with single spaces.

### Dry run: roots `pre`, `un`, `re`; sentence `"unhappy readers prefer reruns"`

| word | walk | first marked node | becomes |
|---|---|---|---|
| unhappy | u → un | "un" | un |
| readers | r → re | "re" | re |
| prefer | p → pr → pre | "pre" | pre |
| reruns | r → re | "re" | re |

Result: `"un re pre re"`.

### Edge cases

- **Nested roots** such as `a`, `aa`, `aaa`: the walk stops at the first marked node, `a`, which is the shortest.
- **A word shorter than every root** that starts it (`"ab"` with root `"abc"`): the word ends before any marked node, so it stays.
- **A word equal to a root** is replaced by itself, which changes nothing.

### Common mistakes

- Picking the **longest** matching root by walking to the end of the path, or the first root in dictionary order instead of the shortest.
- Replacing a word when the walk merely ran out of letters on an unmarked node: that root is longer than the word.
- Building the result with `+=` inside a loop over a very long sentence; collecting words in an array and joining once is simpler and fast.

### Other ways to solve it

Put the roots in a `Set` and, for each word, test `word.slice(0, k)` for `k = 1, 2, …` up to the longest root length; the first hit is the shortest root. It is short to write, but every slice builds a new string, so it costs O(L²) per word against the trie's O(L).
