function groupAnagrams(strs) {
  const groups = new Map(); // sorted letters → the words that use exactly those letters
  for (const word of strs) {
    const key = [...word].sort().join(''); // the default sort is fine for single characters
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}
