### Intuition

A backtracking search tries a word at the start, recurses on the rest, and backs up on failure. It works on friendly inputs but explodes on strings like `"aaaa…ab"` with words `a`, `aa`, `aaa`…: there are exponentially many ways to split the `a`s, and every one of them fails at the final `b`.

The search keeps asking the same question: "can the rest of the string, starting at position `j`, be split?" There are only `n + 1` positions, so answer each once. Turn it around to work on **prefixes**: `s.slice(0, i)` can be split if its **last word** is some `s.slice(j, i)` in the dictionary and the part before it, `s.slice(0, j)`, can be split too.

### Step by step

1. Put the words in a `Set` so each lookup is a hash, not a scan of the list.
2. **State**: `canBuild[i]` = `true` if the prefix `s.slice(0, i)` (its first `i` characters) can be split into dictionary words.
3. **Recurrence**: `canBuild[i]` is true if there is a cut `j < i` with `canBuild[j]` true and `s.slice(j, i)` in the Set.
4. **Base case**: `canBuild[0] = true`: the empty prefix is split into zero words.
5. **Order**: `i` from 1 to `n`. Every `j` is smaller than `i`, so it is already decided.
   - Words are at most `longest` letters long, so only check `j` from `i - longest` upward.
   - Stop at the first `j` that works (`break`): you only need to know that one split exists.
6. **Answer**: `canBuild[n]`.

### Dry run: `s = "hotdogstand"`, words `hot, dog, stand, hotdog, sta`

Only the cells that become true are listed; every other cell stays false because no word ends there after a buildable prefix.

| i | prefix | last word that works | canBuild[i] |
|---|---|---|---|
| 0 | (empty) | (base case) | true |
| 3 | `hot` | `hot` = s.slice(0, 3), canBuild[0] | true |
| 6 | `hotdog` | `hotdog` = s.slice(0, 6), canBuild[0] (`dog` after canBuild[3] works too) | true |
| 9 | `hotdogsta` | `sta` = s.slice(6, 9), canBuild[6] | true |
| 11 | `hotdogstand` | `stand` = s.slice(6, 11), canBuild[6] | **true** |

Note that `canBuild[9]` is true (via `sta`) but leads nowhere: the leftover `nd` is not a word. The table doesn't care; `canBuild[11]` finds its own way through `canBuild[6]`.

### Why it works

Any valid split of the prefix `s.slice(0, i)` has a last word `s.slice(j, i)`, and the words before it form a valid split of `s.slice(0, j)`, so `canBuild[j]` is true. The recurrence tries every possible `j`, so it finds a split whenever one exists, and it never claims a split that doesn't exist because every `true` is backed by a real word and a real shorter split.

### Edge cases

- A letter that appears in no word (the `b` in `"aaa…ab"`) makes every prefix that includes it false, so the answer is false. The table finds that in polynomial time.
- Reusing words: `"abab"` with `["ab"]` uses `ab` twice. Nothing in the recurrence forbids it.
- Overlapping words like `hot` and `hotdog` are fine: the table considers both cuts.

### Common mistakes

- Greedy matching (always take the longest or the shortest word that fits): `"carpets"` and `"aaaaaaa"` with `["aaaa", "aaa"]` break it.
- Backtracking without a memo: correct, but times out on the `"aaa…ab"` test.
- Forgetting `canBuild[0] = true`, so nothing can ever become true.
- `wordDict.includes(piece)` instead of a `Set`: each check becomes a scan of up to 1000 words.

### Other ways to solve it

- **Top-down with a memo** on the start index: `canSplit(start)` tries every word that matches at `start`. Same complexity, and it often stops sooner.
- **Breadth-first search** over cut positions: start at 0; from each position, every word that matches leads to a new position. Reaching `n` means true. A visited set plays the role of the memo.
