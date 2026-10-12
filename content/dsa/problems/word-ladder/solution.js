function ladderLength(beginWord, endWord, wordList) {
  const unused = new Set(wordList); // words not yet queued
  if (!unused.has(endWord)) return 0;
  unused.delete(beginWord);

  const queue = [beginWord];
  let head = 0;
  let length = 1; // number of words in a sequence ending at the current level
  while (head < queue.length) {
    const levelEnd = queue.length;
    while (head < levelEnd) {
      const word = queue[head++];
      if (word === endWord) return length;
      for (let i = 0; i < word.length; i++) {
        for (let code = 97; code <= 122; code++) { // 'a' … 'z'
          const next = word.slice(0, i) + String.fromCharCode(code) + word.slice(i + 1);
          if (!unused.has(next)) continue;
          unused.delete(next); // mark on enqueue: nothing else can queue it again
          queue.push(next);
        }
      }
    }
    length++;
  }
  return 0;
}
