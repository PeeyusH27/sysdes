// Template: BFS with a level-size loop. At the start of each level, the queue holds exactly that level's nodes,
// so snapshot its size and process that many; everything they enqueue belongs to the next level.
export function levelMaxes(root) {
  const result = [];
  const queue = root ? [root] : [];
  let head = 0;                                // queue[head] is the front: no shift(), so dequeue is O(1)
  while (head < queue.length) {
    const size = queue.length - head;          // nodes waiting right now = one full level
    let max = -Infinity;
    for (let i = 0; i < size; i++) {
      const node = queue[head++];
      max = Math.max(max, node.val);           // per-level work goes here: sum, count, first, last…
      if (node.left) queue.push(node.left);    // children line up behind the rest of this level
      if (node.right) queue.push(node.right);
    }
    result.push(max);
  }
  return result;
}

// The same loop with two arrays: build the next level while walking the current one, then swap.
export function levelValues(root) {
  const levels = [];
  let level = root ? [root] : [];
  while (level.length) {
    levels.push(level.map((node) => node.val));
    const next = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
  }
  return levels;
}
