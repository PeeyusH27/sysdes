function findWords(board, words) {
  // Trie of the words; each end node stores its word so the DFS can report it directly.
  const root = { children: new Map(), word: null };
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), word: null });
      node = node.children.get(ch);
    }
    node.word = w;
  }

  const rows = board.length;
  const cols = board[0].length;
  const found = [];

  const dfs = (r, c, parent) => {
    const ch = board[r][c];
    const node = parent.children.get(ch); // "#" (a cell on the current path) never matches
    if (node === undefined) return;       // no word continues with this letter: prune
    if (node.word !== null) {
      found.push(node.word);
      node.word = null;                   // report each word only once
    }
    board[r][c] = "#";                    // mark as used on this path
    if (r > 0) dfs(r - 1, c, node);
    if (r < rows - 1) dfs(r + 1, c, node);
    if (c > 0) dfs(r, c - 1, node);
    if (c < cols - 1) dfs(r, c + 1, node);
    board[r][c] = ch;                     // restore when backtracking
    if (node.children.size === 0 && node.word === null) parent.children.delete(ch); // nothing left below: drop it
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) dfs(r, c, root);
  }
  return found;
}
