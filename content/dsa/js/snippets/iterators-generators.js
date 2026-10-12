// A generator function (function*) pauses at each yield and resumes on the next request.
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}
console.log([...range(0, 10, 3)]);       // [0, 3, 6, 9]

const it = range(0, 2);
console.log(it.next(), it.next(), it.next()); // { value: 0, done: false } { value: 1, done: false } { value: undefined, done: true }

// Lazy in-order walk of a BST: values come out sorted, one at a time.
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } } // @hide
// TreeNode is provided in the editor.
function* inorder(node) {
  if (!node) return;
  yield* inorder(node.left);             // yield* forwards every value of another generator
  yield node.val;
  yield* inorder(node.right);
}
const bst = new TreeNode(5, new TreeNode(3, new TreeNode(2), new TreeNode(4)), new TreeNode(8, null, new TreeNode(9)));
console.log([...inorder(bst)]);          // [2, 3, 4, 5, 8, 9]

// Early exit: stop after k values and the rest of the tree is never visited.
function kthSmallest(root, k) {
  for (const val of inorder(root)) {
    if (--k === 0) return val;
  }
  return null;
}
console.log(kthSmallest(bst, 3));        // 4

// Breaking out of for...of closes the generator, so its finally block runs.
function* noisy() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('cleanup');
  }
}
for (const x of noisy()) {
  console.log('got', x);                 // got 1
  break;                                 // prints cleanup right away
}
