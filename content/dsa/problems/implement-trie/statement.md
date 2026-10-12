A **trie** (prefix tree) stores a set of strings so that both whole words and prefixes can be looked up quickly. Implement a class `Trie` with:

- `constructor()`: creates an empty trie.
- `insert(word)`: adds `word` to the trie. Inserting the same word twice has no extra effect.
- `search(word)`: returns `true` if `word` was inserted earlier, and `false` otherwise. A word that is only the beginning of an inserted word does not count.
- `startsWith(prefix)`: returns `true` if at least one inserted word starts with `prefix` (a whole word counts as a prefix of itself), and `false` otherwise.

Each test creates a `Trie`, calls the methods in the order shown, and compares the return values of `search` and `startsWith` (`insert` returns nothing, shown as `null`, and isn't checked).

### Constraints

- `1 <= word.length, prefix.length <= 2000`
- Words and prefixes contain lowercase English letters only.
- At most `3 * 10^4` calls in total.
