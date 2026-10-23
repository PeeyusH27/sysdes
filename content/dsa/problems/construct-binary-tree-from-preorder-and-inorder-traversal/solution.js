function buildTree(preorder, inorder) {
  const indexOf = new Map(inorder.map((v, i) => [v, i])); // value -> position in inorder
  let next = 0; // the next unused value of preorder is always the next subtree root

  const build = (lo, hi) => {
    if (lo > hi) return null;
    const rootVal = preorder[next++];
    const mid = indexOf.get(rootVal);
    const node = new TreeNode(rootVal);
    node.left = build(lo, mid - 1); // must come first: preorder lists the left subtree before the right
    node.right = build(mid + 1, hi);
    return node;
  };

  return build(0, inorder.length - 1);
}
