function lowestCommonAncestor(root, p, q) {
  // Returns the node holding p or q found in this subtree, or the LCA once both have been found.
  const find = (node) => {
    if (node === null) return null;
    if (node.val === p || node.val === q) return node;
    const left = find(node.left);
    const right = find(node.right);
    if (left !== null && right !== null) return node; // one target on each side: the paths split here
    return left ?? right;
  };
  return find(root).val;
}
