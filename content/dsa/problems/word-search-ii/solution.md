### Intuition

The single-word version is a backtracking DFS: from every cell, try to spell the word step by step, marking cells as used on the current path. Running it once per word works, but with thousands of words that share prefixes ("tree", "trees", "tries") the same grid paths are walked again and again.

Flip it around: **walk the grid once and check all the words at the same time.** Put the words in a trie. Start a DFS from every cell and carry a trie node with it:

- stepping onto a cell with letter `ch` moves the trie pointer to its child `ch`;
- if there is **no such child**, no word starts with the letters on this path, so the whole path is abandoned on the spot;
- if the trie node **stores a word**, that word has just been traced: record it.

The trie prunes the search: the DFS only ever follows paths that are prefixes of some word.

### Step by step

1. Build a trie of `words`. Instead of an end flag, store the whole word on its last node (`node.word = w`).
2. Define `dfs(r, c, parent)`, where `parent` is the trie node for the letters before this cell:
   1. Look up `node = parent.children.get(board[r][c])`. If it is missing, return.
   2. If `node.word` is set, push it to the result and set `node.word = null` so it is never reported twice.
   3. Mark the cell as used: `board[r][c] = "#"` (no word contains `#`, so the lookup in step 1 fails on it).
   4. Recurse into the four neighbours that are inside the grid.
   5. Restore the cell's letter.
   6. Optional pruning: if `node` now has no children and no word, delete it from `parent`, so later searches don't walk into a finished branch.
3. Call `dfs(r, c, root)` for every cell, then return the result.

### Dry run: board `["ab", "cd"]`, words `abdc`, `abcd`, `acdb`, `ba`

| start | path (cells) | trie node reached | result |
|---|---|---|---|
| a (0,0) | a → b → d → c | "abdc" stores a word | add **abdc** |
| a (0,0) | a → b, then c? | b's neighbours are a (used) and d; "abc" is never reached | abcd not found |
| a (0,0) | a → c → d → b | "acdb" stores a word | add **acdb** |
| b (0,1) | b → a | "ba" stores a word | add **ba** |
| c, d | first letter | the root has no c or d child | pruned at once |

Result: `["abdc", "acdb", "ba"]`, in any order.

### Why it works

Every traced word corresponds to a path in the grid that starts at some cell, and the DFS from that cell explores every simple path whose letters stay inside the trie. A path that leaves the trie can't be the start of any word, so cutting it loses nothing. Clearing `node.word` after the first find keeps each word once, even when several paths spell it.

### Common mistakes

- Not marking cells as used, so a path reuses a letter (`["a"]` would wrongly contain `"aa"`).
- Forgetting to restore the cell after the recursive calls: later searches see `#` and miss words.
- Reporting a word every time a new path spells it (`"aa"` on a 2 × 2 grid of a's). Clear the stored word, or collect results in a `Set`.
- Running the single-word search for every word: correct, but far too slow when there are many words.

### Other ways to solve it

**One backtracking search per word** (the single-word version in a loop). It costs O(words × m × n × 4 · 3^(L-1)) and redoes shared prefixes, so it only fits small inputs. The trie version is the standard answer; deleting finished leaves keeps it fast as words are found.
