class TrieNode {
  constructor() {
    this.children = new Map(); // character -> TrieNode
    this.isEnd = false;        // does an inserted word end exactly here?
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  search(word) {
    const node = this.#walk(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.#walk(prefix) !== null;
  }

  // Follows s from the root and returns the node it reaches, or null if the path breaks off.
  #walk(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (node === undefined) return null;
    }
    return node;
  }
}
