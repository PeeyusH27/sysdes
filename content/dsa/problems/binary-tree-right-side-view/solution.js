function rightSideView(root) {
  const view = [];
  const queue = root ? [root] : [];
  let head = 0;
  while (head < queue.length) {
    const size = queue.length - head;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      if (i === size - 1) view.push(node.val); // the last node of a level is the rightmost
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return view;
}
