class WordDictionary {
  constructor() {
    this.root = { children: new Map(), isEnd: false };
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), isEnd: false });
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  search(word) {
    // dfs(node, i): can word[i..] be matched starting below node?
    const dfs = (node, i) => {
      if (i === word.length) return node.isEnd;
      const ch = word[i];
      if (ch !== ".") {
        const child = node.children.get(ch);
        return child !== undefined && dfs(child, i + 1);
      }
      for (const child of node.children.values()) {
        if (dfs(child, i + 1)) return true; // one matching branch is enough
      }
      return false;
    };
    return dfs(this.root, 0);
  }
}
