// BST template: in a binary search tree every value in a left subtree is smaller than the node and every value in a
// right subtree is larger. So one comparison tells you which whole subtree can't contain what you want: skip it.
export function rangeSum(root, low, high) {
  if (root === null) return 0;
  if (root.val < low) return rangeSum(root.right, low, high);  // root and its entire left subtree are too small
  if (root.val > high) return rangeSum(root.left, low, high);  // root and its entire right subtree are too large
  return root.val + rangeSum(root.left, low, high) + rangeSum(root.right, low, high);
}

// Walking down one branch needs no recursion at all: O(height).
export function searchBST(root, target) {
  let node = root;
  while (node !== null && node.val !== target) node = target < node.val ? node.left : node.right;
  return node;
}
