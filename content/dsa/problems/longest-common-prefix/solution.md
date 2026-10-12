### Intuition

Put every string into a trie. Each node stands for a prefix, so the nodes that **all** strings pass through are exactly the common prefixes. Starting at the root, the shared path continues as long as two things hold:

- the current node has **exactly one child**: every string continues with the same next character;
- **no string ends** at the current node: a string that ends here is as long as the common prefix can get.

As soon as the path branches, or some string stops, the characters collected so far are the answer.

### Step by step

1. Build a trie: insert every string, creating children as needed, and mark the node where each string ends.
2. Start at the root with `prefix = ""`.
3. While the current node has exactly one child and is not marked as an end:
   1. Take that only child; append its character to `prefix`.
   2. Move to the child.
4. Return `prefix`.

### Dry run: `["interview", "internet", "interval", "internal"]`

| node (prefix so far) | children | ends here? | action |
|---|---|---|---|
| root ("") | i | no | take i |
| "i" | n | no | take n |
| "in" | t | no | take t |
| "int" | e | no | take e |
| "inte" | r | no | take r |
| "inter" | v, n | no | **two children: stop** |

The answer is `"inter"`.

### Edge cases

- An empty string in the list marks the root as an end, so the loop never runs: the answer is `""`.
- A single string: the path never branches, and the loop stops at its last character, so the answer is the whole string.
- When one string is a prefix of another (`["a", "ab", "abc"]`), the end mark on `"a"` stops the walk there.

### Common mistakes

- Forgetting the end-of-string check: for `["ab", "abc"]` the node for `"ab"` still has one child, so the walk would wrongly continue to `"abc"`.
- Comparing only the first two strings, or only the shortest and longest by length (sorting alphabetically and comparing the first and last string does work).

### Other ways to solve it

**Vertical scanning**: compare `strs[0][i]` with the same position in every other string, for `i = 0, 1, 2, …`, and stop at the first mismatch or the end of any string. It is O(S) time and O(1) extra space, the leanest answer when you only need the prefix once. The trie wins when you must answer many prefix questions about the same set of strings.
