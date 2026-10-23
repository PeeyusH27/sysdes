function leastInterval(tasks, n) {
  const freq = new Map();
  for (const t of tasks) freq.set(t, (freq.get(t) ?? 0) + 1);

  // Max-heap of how many copies of each task type remain.
  const heap = [];
  const push = (v) => {
    heap.push(v);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p] >= heap[i]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let big = i;
        const l = 2 * i + 1;
        const r = l + 1;
        if (l < heap.length && heap[l] > heap[big]) big = l;
        if (r < heap.length && heap[r] > heap[big]) big = r;
        if (big === i) break;
        [heap[big], heap[i]] = [heap[i], heap[big]];
        i = big;
      }
    }
    return top;
  };
  for (const c of freq.values()) push(c);

  const cooling = []; // [remaining count, time when it may re-enter the heap], in time order
  let head = 0;
  let time = 0;
  while (heap.length > 0 || head < cooling.length) {
    time++;
    if (heap.length > 0) {
      const left = pop() - 1; // run the task type with the most copies left
      if (left > 0) cooling.push([left, time + n]);
    } // else: idle this tick
    if (head < cooling.length && cooling[head][1] === time) push(cooling[head++][0]);
  }
  return time;
}
