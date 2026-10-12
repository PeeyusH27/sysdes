// Helpers so the snippets run on their own. A node is any object with val, left and right
// (the same shape as the TreeNode class the problems give you).
export function node(val, left = null, right = null) {
  return { val, left, right };
}

// Builds a tree from level order with nulls for missing children, e.g. [8, 3, 10, 1, 6, null, 14].
export function fromArray(values) {
  if (!values.length || values[0] === null) return null;
  const root = node(values[0]);
  const queue = [root];
  let head = 0;
  for (let i = 1; i < values.length; i += 2) {
    const parent = queue[head++];
    if (values[i] != null) queue.push((parent.left = node(values[i])));
    if (values[i + 1] != null) queue.push((parent.right = node(values[i + 1])));
  }
  return root;
}
