// Template 1: return a value up (post-order). Ask both subtrees for their answer, then combine at the node.
// Use it for height, size, sums, "is it balanced?": anything a node can compute from its children's answers.
export function height(root) {
  if (root === null) return 0;          // an empty subtree has height 0, so a leaf gets 1
  const left = height(root.left);
  const right = height(root.right);
  return 1 + Math.max(left, right);     // combine on the way back up
}

// Same shape, different combine. -1 means "unbalanced somewhere below", so one number carries both answers
// and the whole check stays O(n) instead of recomputing heights at every node.
export function isBalanced(root) {
  const check = (node) => {
    if (node === null) return 0;
    const left = check(node.left);
    if (left === -1) return -1;
    const right = check(node.right);
    if (right === -1 || Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  };
  return check(root) !== -1;
}
