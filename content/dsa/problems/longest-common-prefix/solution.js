function longestCommonPrefix(strs) {
  const newNode = () => ({ children: new Map(), isEnd: false });
  const root = newNode();
  for (const s of strs) {
    let node = root;
    for (const ch of s) {
      if (!node.children.has(ch)) node.children.set(ch, newNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }
  // The shared prefix is the path down from the root while there is only one way to go
  // and no string has ended yet.
  let prefix = "";
  let node = root;
  while (node.children.size === 1 && !node.isEnd) {
    const [ch, child] = node.children.entries().next().value;
    prefix += ch;
    node = child;
  }
  return prefix;
}
