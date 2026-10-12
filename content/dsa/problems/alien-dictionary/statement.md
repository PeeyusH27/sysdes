An alien language uses some of the lowercase English letters, but its alphabet puts them in an unknown order. You are given a list `words` that is claimed to be sorted according to that alphabet. Words are compared the usual way: at the first position where they differ, the word with the earlier letter comes first, and a word always comes before a longer word that it is a prefix of.

Return a string that contains every letter appearing in `words` exactly once, in an order consistent with the sorted list. If several orders are consistent, return **any** of them. If no order of the letters could make the list sorted, return the empty string `""`.

### Constraints

- `1 <= words.length <= 100`
- `1 <= words[i].length <= 100`
- `words[i]` consists of lowercase English letters
