// trie.js (server): every node keeps its top-K completions, so a lookup is O(prefix length)
// Built offline from query logs (score = popularity) and swapped in atomically, so scores only go up between rebuilds.
class TrieNode { constructor() { this.children = new Map(); this.top = []; } }

export class Trie {
  constructor(k = 8) { this.root = new TrieNode(); this.k = k; }
  insert(word, score) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {                             // case-insensitive path, original casing kept for display
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
      node.top = [...node.top.filter(e => e.word !== word), { word, score }]   // re-inserting a word updates its score
        .sort((a, b) => b.score - a.score)
        .slice(0, this.k);
    }
  }
  suggest(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      node = node.children.get(ch);
      if (!node) return [];
    }
    return node.top.map(e => e.word);                                 // already ranked: no subtree walk at query time
  }
}
