function averageOfLevels(root) {
  const averages = [];
  const queue = root ? [root] : [];
  let head = 0; // front of the queue: avoids shift(), which is O(n)
  while (head < queue.length) {
    const size = queue.length - head; // every node waiting now is on this level
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      sum += node.val;
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    averages.push(sum / size);
  }
  return averages;
}
