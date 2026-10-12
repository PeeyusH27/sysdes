// The same heap as plain functions on an array (a min heap of numbers), with a swap counter.
let swaps = 0;
function swap(a, i, j) {
  [a[i], a[j]] = [a[j], a[i]];
  swaps++;
}
function siftUp(a, i) {
  while (i > 0 && a[(i - 1) >> 1] > a[i]) {
    swap(a, i, (i - 1) >> 1);
    i = (i - 1) >> 1;
  }
}
function siftDown(a, i, n = a.length) {
  while (true) {
    const l = 2 * i + 1;
    const r = l + 1;
    let m = i;
    if (l < n && a[l] < a[m]) m = l;
    if (r < n && a[r] < a[m]) m = r;
    if (m === i) return;
    swap(a, i, m);
    i = m;
  }
}
// Heapify in place: leaves are already heaps, so fix each internal node from the last one up.
function heapify(a) {
  for (let i = (a.length >> 1) - 1; i >= 0; i--) siftDown(a, i);
  return a;
}
const isMinHeap = (a) => a.every((x, i) => i === 0 || a[(i - 1) >> 1] <= x);

const nums = [9, 4, 7, 1, 8, 2, 6];
console.log(heapify(nums), isMinHeap(nums)); // [1, 4, 2, 9, 8, 7, 6] true

// Why O(n)? Most nodes sit near the bottom and can sink only a level or two.
// Count swaps on n descending numbers, the worst case for a min heap:
for (const n of [1000, 100000]) {
  const desc = Array.from({ length: n }, (_, i) => n - i);
  swaps = 0;
  heapify(desc.slice());
  const viaHeapify = swaps;
  swaps = 0;
  const pushed = [];
  for (const x of desc) {
    pushed.push(x);
    siftUp(pushed, pushed.length - 1);
  }
  console.log(n, 'heapify:', viaHeapify, 'one push at a time:', swaps);
}
// 1000 heapify: 992 one push at a time: 7987
// 100000 heapify: 99990 one push at a time: 1468946
