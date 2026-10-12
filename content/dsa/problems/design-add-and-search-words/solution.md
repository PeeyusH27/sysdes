### Intuition

Store the words in a **trie**. Without dots, a search is the usual walk: one edge per character, then check the end-of-word flag.

A dot breaks the single path: at that position the next character could be anything, so **every child** of the current node is a candidate. That turns the walk into a depth-first search over `(node, position in the search string)`:

- a letter follows exactly one edge (or fails if the edge is missing);
- a dot tries each child in turn, and the search succeeds if **any** branch succeeds;
- when the search string is used up, the current node must be the end of a stored word.

The trie keeps this cheap: a branch is abandoned the moment its letters stop matching what was stored.

### Step by step

1. Each node has `children` (a `Map`) and `isEnd`.
2. `addWord(word)`: walk from the root, creating missing children, and mark the last node.
3. `search(word)` runs `dfs(root, 0)`, where `dfs(node, i)`:
   1. If `i === word.length`, return `node.isEnd`.
   2. If `word[i]` is a letter, look up that child. Missing means `false`; otherwise return `dfs(child, i + 1)`.
   3. If `word[i]` is a dot, call `dfs(child, i + 1)` for each child and return `true` as soon as one does. If none does, return `false`.

### Dry run: words `ab`, `ac`, `bd`; `search(".d")`

| call | character | what happens | result |
|---|---|---|---|
| dfs(root, 0) | `.` | try children a, then b | |
| dfs("a", 1) | `d` | "a" has children b and c, no d | false |
| dfs("b", 1) | `d` | follow d to "bd" | |
| dfs("bd", 2) | end | "bd" is marked as a word | **true** |

The first branch failed, the search backed up to the dot and tried the next child.

### Edge cases

- The length must match exactly: a pattern that is used up on a node that is not the end of a word fails, and a pattern longer than every word falls off the trie.
- A dot never matches "no letter": `".."` does not match the one-letter word `"a"`.
- Searching an empty dictionary returns `false` for every pattern, including `"."`.

### Common mistakes

- `return dfs(child, i + 1)` inside the loop over children: it returns after the first child even if that branch failed.
- Returning `true` when the pattern is used up without checking `isEnd`, so prefixes count as words.
- Scanning a plain list of all words for every search: correct, but O(number of words × length) per query.

### Other ways to solve it

Group the words by length in a `Map` from length to a list of words, and compare the pattern against each word of the same length character by character. It is simple and fine when there are few words per length, but a trie shares the work for words with common prefixes.
