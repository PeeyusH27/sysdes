// Wildcard search on a trie (built with the Trie template): '.' matches any one character.
// A letter follows a single edge; a dot branches into every child. A branch that breaks off dies at once.
export function matchesPattern(trie, pattern) {
  const dfs = (node, i) => {
    if (i === pattern.length) return node.isEnd;   // used up the pattern: is this a whole word?
    const ch = pattern[i];
    if (ch !== '.') {
      const child = node.children.get(ch);
      return child !== undefined && dfs(child, i + 1);
    }
    for (const child of node.children.values()) {
      if (dfs(child, i + 1)) return true;          // stop at the first branch that matches
    }
    return false;
  };
  return dfs(trie.root, 0);
}
