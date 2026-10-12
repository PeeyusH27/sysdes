function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const longest = Math.max(...wordDict.map((w) => w.length));
  const canBuild = new Array(s.length + 1).fill(false); // canBuild[i]: s.slice(0, i) splits into words
  canBuild[0] = true;                                    // the empty prefix needs no words
  for (let i = 1; i <= s.length; i++) {
    // the last word is s.slice(j, i); it is at most `longest` letters, so j can't start further back
    for (let j = Math.max(0, i - longest); j < i; j++) {
      if (canBuild[j] && words.has(s.slice(j, i))) {
        canBuild[i] = true;
        break;
      }
    }
  }
  return canBuild[s.length];
}
