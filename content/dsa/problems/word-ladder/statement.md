You are given a start word `beginWord`, a target word `endWord` and a dictionary `wordList`.

A **transformation sequence** starts at `beginWord` and ends at `endWord`, and each word in it differs from the word before it in exactly one letter position (no letters are added, removed or moved). Every word after `beginWord` must come from `wordList`; `beginWord` itself doesn't need to be in the list.

Return the **number of words** in the shortest transformation sequence, counting both ends, or `0` if no sequence exists.

### Constraints

- `1 <= beginWord.length <= 10`, and `endWord` and every word in `wordList` have the same length
- `1 <= wordList.length <= 5000`
- All words consist of lowercase English letters, and `beginWord !== endWord`
- `wordList` may contain duplicates
