// The same trie with a fixed array of 26 children per node, for lowercase 'a' to 'z' only.
// No hashing, so it is fast and predictable; but every node pays for 26 slots even if it uses one.
const CODE_A = 'a'.charCodeAt(0);
const arrayNode = () => ({ next: new Array(26).fill(null), isEnd: false });

export class ArrayTrie {
  constructor() {
    this.root = arrayNode();
  }

  insert(word) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const c = word.charCodeAt(i) - CODE_A; // 'a' -> 0, 'b' -> 1, … 'z' -> 25
      node.next[c] ??= arrayNode();
      node = node.next[c];
    }
    node.isEnd = true;
  }

  search(word) {
    let node = this.root;
    for (let i = 0; i < word.length && node !== null; i++) node = node.next[word.charCodeAt(i) - CODE_A];
    return node !== null && node.isEnd;
  }
}
