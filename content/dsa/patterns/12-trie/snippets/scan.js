// Pruned search: from each start position, walk the trie while reading the text, and stop the moment no stored
// word continues that way. Finds every dictionary word that appears in text, as [start, word] pairs.
export function findAllMatches(text, trie) {
  const found = [];
  for (let start = 0; start < text.length; start++) {
    let node = trie.root;
    for (let end = start; end < text.length; end++) {
      node = node.children.get(text[end]);
      if (!node) break;                                   // dead end: no word has this prefix, so stop early
      if (node.isEnd) found.push([start, text.slice(start, end + 1)]);
    }
  }
  return found;
}
