function isValidBST(root) {
  // Every node must lie strictly inside the range set by all of its ancestors.
  const check = (node, low, high) => {
    if (node === null) return true;
    if (node.val <= low || node.val >= high) return false;
    return check(node.left, low, node.val) && check(node.right, node.val, high);
  };
  return check(root, -Infinity, Infinity);
}
