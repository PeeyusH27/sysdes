// A queue as an array plus a head index: dequeue is head++, never shift().
const q = ['a', 'b'];
let head = 0;
q.push('c');                             // enqueue at the back: O(1)
console.log(q[head++], q[head++]);       // a b: dequeue from the front, O(1)
console.log(q.length - head, q[head]);   // 1 c: size and front

// Why not shift()? It moves every remaining element down one slot.
function drainWithShift(n) {
  const queue = Array.from({ length: n }, (_, i) => i);
  let sum = 0;
  while (queue.length) sum += queue.shift();
  return sum;
}
function drainWithHead(n) {
  const queue = Array.from({ length: n }, (_, i) => i);
  let sum = 0;
  for (let h = 0; h < queue.length; h++) sum += queue[h];
  return sum;
}
for (const drain of [drainWithHead, drainWithShift]) {
  const start = performance.now();
  drain(50000);
  console.log(drain.name, Math.round(performance.now() - start), 'ms');
}
// drainWithHead 1 ms
// drainWithShift 130 ms   (Node 24; the gap grows with n², and engines differ)
