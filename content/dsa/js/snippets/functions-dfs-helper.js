class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
// TreeNode is provided in the editor (see "Linked list and tree nodes").

// The helper returns one thing (a height) and updates another (best) through the closure.
function diameter(root) {
  let best = 0;                          // longest path seen so far, in edges
  function height(node) {
    if (!node) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right); // path that bends at this node
    return 1 + Math.max(left, right);
  }
  height(root);
  return best;
}
const root = new TreeNode(1, new TreeNode(2, new TreeNode(4), new TreeNode(5)), new TreeNode(3));
console.log(diameter(root));             // 3: 4 -> 2 -> 1 -> 3

// Backtracking: the helper shares `path` and `result` instead of passing them around.
function subsets(nums) {
  const result = [];
  const path = [];
  function choose(i) {
    if (i === nums.length) {
      result.push([...path]);            // push a copy: path keeps changing
      return;
    }
    path.push(nums[i]);                  // take nums[i]
    choose(i + 1);
    path.pop();                          // undo, then skip nums[i]
    choose(i + 1);
  }
  choose(0);
  return result;
}
console.log(subsets([1, 2, 3]));         // [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
