// A trie node: one child per next character, plus a flag that says "a word ends here".
class TrieNode {
  constructor() {
    this.children = new Map(); // character -> TrieNode
    this.isEnd = false;
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true; // the path alone doesn't make a word: mark where this one ends
  }

  // The node reached by following prefix from the root, or null if the path breaks off.
  find(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }

  search(word) {
    const node = this.find(word);
    return node !== null && node.isEnd; // the path must exist AND end a word
  }

  startsWith(prefix) {
    return this.find(prefix) !== null;  // any path at all is enough
  }

  // Autocomplete: every stored word that starts with prefix, found by a DFS below the prefix's node.
  wordsWithPrefix(prefix) {
    const out = [];
    const dfs = (node, path) => {
      if (node.isEnd) out.push(path);
      for (const [ch, child] of node.children) dfs(child, path + ch);
    };
    const start = this.find(prefix);
    if (start) dfs(start, prefix);
    return out;
  }
}
