### Intuition

Make every word a node, and join two words with an edge when they differ in exactly one position. A transformation sequence is then a path from `beginWord` to `endWord`, and the shortest sequence is the path with the fewest edges. Fewest edges in an unweighted graph means **BFS**. The answer counts words, which is one more than the number of edges.

Building every edge up front by comparing all pairs of words costs O(N² · L). It is cheaper to generate a word's neighbours on the fly: for each position, try all 26 letters and keep the candidates that are in the dictionary. A `Set` makes each lookup fast.

### Step by step

1. Put `wordList` into a Set called `unused`. If `endWord` isn't in it, return 0. Remove `beginWord` from it, since the search starts there.
2. Set `queue = [beginWord]`, `head = 0` and `length = 1`.
3. While `head < queue.length`:
   1. Remember `levelEnd = queue.length`. For each word up to `levelEnd`:
      1. If it is `endWord`, return `length`.
      2. For each position `i` and each letter from `a` to `z`, build `next`. If `unused` has it, delete it from `unused` and push it onto the queue.
   2. Increase `length`: the next level is one word further from the start.
4. Return 0: `endWord` was never reached.

Deleting a word from `unused` when it is queued is the visited mark: it can never be queued again.

### Dry run: `cold` → `warm`, wordList = `[cord, card, ward, warm, worm, word, wore, core, care, ware]`

| length | words at this level | newly queued (and deleted from `unused`) |
|---|---|---|
| 1 | cold | cord |
| 2 | cord | word, card, core |
| 3 | word, card, core | ward, wore, worm (from word); care (from card); nothing new from core |
| 4 | ward, wore, worm, care | ware, warm (both from ward) |
| 5 | ware, warm | `warm` is the end word: return 5 |

`worm` could also lead to `warm`, but `ward` queued it first, at the same level, so the answer is unchanged.

### Why it works

BFS dequeues words in order of their distance from `beginWord`, one level at a time. The first time `endWord` comes out of the queue, it is at the smallest possible level, so `length` is the length of the shortest sequence. Each word is queued once, at its shortest distance, because it leaves `unused` the moment it is first discovered.

### Edge cases

- **`endWord` isn't in the list:** no sequence can end there. Return 0 straight away.
- **`beginWord` is in the list:** remove it from `unused` so the search never walks back to it.
- **Duplicates in the list:** the Set ignores them.
- **No path:** the queue empties without meeting `endWord`, so return 0.

### Common mistakes

- Returning the number of changes (edges) instead of the number of words: off by one.
- Marking words as visited when they are dequeued instead of when they are queued. Many words of one level can queue the same neighbour, and the queue blows up.
- Comparing every pair of words to build the graph: O(N² · L), too slow for 5000 words.
- Using DFS: it finds *a* sequence, not necessarily the shortest one.

### Other ways to solve it

- **Wildcard buckets:** map each pattern such as `c*ld` to the words that match it. Words that share a bucket are neighbours. Same complexity, and no loop over 26 letters.
- **Bidirectional BFS:** search from both ends at once, always expanding the smaller frontier, and stop when they meet. It visits far fewer words on large dictionaries.
