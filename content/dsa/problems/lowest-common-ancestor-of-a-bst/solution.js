function lowestCommonAncestorBST(root, p, q) {
  let node = root;
  while (node !== null) {
    if (p < node.val && q < node.val) node = node.left; // both targets are in the left subtree
    else if (p > node.val && q > node.val) node = node.right; // both are in the right subtree
    else return node.val; // the paths split here, or this node is p or q itself
  }
  return null; // unreachable when p and q exist
}
