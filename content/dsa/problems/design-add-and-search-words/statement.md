Design a data structure that stores words and answers searches in which some letters may be unknown. Implement a class `WordDictionary` with:

- `constructor()`: creates an empty dictionary.
- `addWord(word)`: stores `word`.
- `search(word)`: returns `true` if some stored word matches `word`, and `false` otherwise. In the search string, a dot `.` matches **any single letter**; every other character must match exactly. A match must have the same length as the stored word.

Each test creates a `WordDictionary`, calls the methods in the order shown, and compares the return value of every `search` (`addWord` returns nothing, shown as `null`, and isn't checked).

### Constraints

- `1 <= word.length <= 25`
- Words passed to `addWord` contain lowercase English letters only.
- Search strings contain lowercase English letters and dots.
- At most `10^4` calls in total.
