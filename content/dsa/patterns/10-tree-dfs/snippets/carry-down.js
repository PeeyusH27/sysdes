// Template 2: carry state down (pre-order). Each call receives what its ancestors know (the max so far, a running
// sum, the allowed range) and hands an updated value to its children. Primitives are copied, so nothing to undo.
export function goodNodes(root) {
  // A node is "good" when nothing on the path from the root down to it is larger than it.
  const dfs = (node, maxSoFar) => {
    if (node === null) return 0;
    const good = node.val >= maxSoFar ? 1 : 0;
    const nextMax = Math.max(maxSoFar, node.val);
    return good + dfs(node.left, nextMax) + dfs(node.right, nextMax);
  };
  return dfs(root, -Infinity);
}

// Carrying a whole path down: push before recursing, pop after (backtracking), copy it only at a leaf.
export function rootToLeafPaths(root) {
  const paths = [];
  const path = [];
  const dfs = (node) => {
    if (node === null) return;
    path.push(node.val);
    if (node.left === null && node.right === null) paths.push([...path]); // copy: path keeps changing
    dfs(node.left);
    dfs(node.right);
    path.pop();                                                           // undo before returning to the parent
  };
  dfs(root);
  return paths;
}
