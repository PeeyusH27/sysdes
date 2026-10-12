class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
// TreeNode is provided in the editor. This tree is [1, 2, 3, 4, 5, null, 6] in level order:
//        1
//       / \
//      2   3
//     / \   \
//    4   5   6
const root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)), new TreeNode(3, null, new TreeNode(6)));

// Depth-first: the three orders differ only in where the node itself is visited.
function walk(node, order, out = []) {
  if (!node) return out;
  if (order === 'pre') out.push(node.val);
  walk(node.left, order, out);
  if (order === 'in') out.push(node.val);
  walk(node.right, order, out);
  if (order === 'post') out.push(node.val);
  return out;
}
console.log(walk(root, 'pre'));          // [1, 2, 4, 5, 3, 6]
console.log(walk(root, 'in'));           // [4, 2, 5, 1, 3, 6]
console.log(walk(root, 'post'));         // [4, 5, 2, 6, 3, 1]

// Breadth-first: a queue, one level at a time.
function levelOrder(root) {
  const out = [];
  let level = root ? [root] : [];
  while (level.length) {
    out.push(level.map((n) => n.val));
    level = level.flatMap((n) => [n.left, n.right]).filter(Boolean); // the next level
  }
  return out;
}
console.log(levelOrder(root));           // [[1], [2, 3], [4, 5, 6]]

// Optional chaining reads through missing nodes without crashing.
console.log(root.right.left?.val, root.right.left?.val ?? 'none'); // undefined none
