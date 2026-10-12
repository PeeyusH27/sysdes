// The three depth-first orders differ only in WHEN a node does its work relative to its children.
export function traversals(root) {
  const pre = [];
  const inorder = [];
  const post = [];
  const dfs = (node) => {
    if (node === null) return;
    pre.push(node.val);       // before the children: top-down work (pass something down)
    dfs(node.left);
    inorder.push(node.val);   // between them: on a BST this visits values in sorted order
    dfs(node.right);
    post.push(node.val);      // after both: bottom-up work (combine the children's answers)
  };
  dfs(root);
  return { pre, inorder, post };
}
