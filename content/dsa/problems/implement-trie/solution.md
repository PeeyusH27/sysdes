### Intuition

Store words as **paths**. Each node represents the prefix spelled by the edges from the root down to it, and keeps a map from "next character" to child node. Words that share a beginning share the same nodes, so `"car"` and `"cart"` use one path, and `"cart"` just continues one step further.

A path existing is not the same as a word existing: after inserting only `"cart"`, the node for `"car"` exists but `"car"` was never inserted. So each node also has an **end flag**, set on the last node of every inserted word. That flag is the whole difference between the two queries:

- `search(word)`: the path must exist **and** its last node must be flagged.
- `startsWith(prefix)`: the path only has to exist.

### Step by step

1. A node holds `children` (a `Map` from character to node) and `isEnd` (initially `false`). The trie starts with an empty root node.
2. `insert(word)`: start at the root. For each character, create the child if it is missing, then move into it. After the last character, set `isEnd = true`.
3. A helper `walk(s)` starts at the root and follows one child per character. If a child is missing, return `null`; otherwise return the node reached after the last character.
4. `search(word)`: `walk(word)` must return a node whose `isEnd` is `true`.
5. `startsWith(prefix)`: `walk(prefix)` must return a node (any node).

### Dry run

`insert("code")`, `search("code")`, `search("cod")`, `startsWith("cod")`, `insert("cod")`, `search("cod")`:

| call | walk ends at | isEnd there | returns |
|---|---|---|---|
| insert("code") | creates c, co, cod, code; marks "code" | | null |
| search("code") | node "code" | true | true |
| search("cod") | node "cod" | false | **false**: only a prefix |
| startsWith("cod") | node "cod" | (not checked) | true |
| insert("cod") | reuses c, co, cod; marks "cod" | | null |
| search("cod") | node "cod" | true | true |

### Why it is fast

Every call follows at most one edge per character of its argument, so each operation is O(L) for a string of length L, no matter how many words are stored. Insert creates at most L nodes, so the trie's size is bounded by the total length of everything inserted.

### Common mistakes

- `search` returning `true` whenever the path exists, which treats every prefix as a word.
- Setting the end flag on every node along the path instead of only the last one.
- Sharing one object between nodes, for example `new Array(26).fill(new TrieNode())`, which puts the same node in every slot.
- Using a plain object for children without care: a `Map` (or `Object.create(null)`) avoids inherited keys.

### Other ways to solve it

Store children in an array of 26 (index `ch.charCodeAt(0) - 97`) instead of a `Map`. Lookups avoid hashing, but every node reserves 26 slots even when it uses one. Both are O(L) per operation.
