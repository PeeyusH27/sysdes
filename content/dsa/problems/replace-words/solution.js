function replaceWords(dictionary, sentence) {
  const newNode = () => ({ children: new Map(), isEnd: false });
  const trie = newNode();
  for (const root of dictionary) {
    let node = trie;
    for (const ch of root) {
      if (!node.children.has(ch)) node.children.set(ch, newNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  // The shortest root that word starts with, or word itself if there is none.
  const shorten = (word) => {
    let node = trie;
    for (let i = 0; i < word.length; i++) {
      node = node.children.get(word[i]);
      if (node === undefined) return word;           // no root continues this way
      if (node.isEnd) return word.slice(0, i + 1);   // the first root on the path is the shortest
    }
    return word;
  };

  return sentence.split(" ").map(shorten).join(" ");
}
