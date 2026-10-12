class TrieNode {
  constructor() {
    this.children = new Map();           // char -> TrieNode
    this.isWord = false;
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
    node.isWord = true;
  }
  #walk(prefix) {                        // private helper: last node of prefix, or null
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) {
    return this.#walk(word)?.isWord === true;
  }
  startsWith(prefix) {
    return this.#walk(prefix) !== null;
  }
}
const trie = new Trie();
for (const w of ['car', 'card', 'care', 'dog']) trie.insert(w);
console.log(trie.search('car'), trie.search('ca'), trie.startsWith('ca')); // true false true
console.log(trie.search('cards'), trie.startsWith('do'));                  // false true
