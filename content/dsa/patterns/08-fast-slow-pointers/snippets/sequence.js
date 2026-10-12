// Template 3: a cycle in an implicit sequence x0, f(x0), f(f(x0)), … Nothing is stored: f plays the role of node.next.
// Returns where the repeating part starts, how many steps lead into it (tail) and how long it is.
export function floyd(f, x0) {
  let slow = x0;
  let fast = x0;
  do {                     // phase 1: meet somewhere inside the cycle
    slow = f(slow);
    fast = f(f(fast));
  } while (slow !== fast);
  let entry = x0;          // phase 2: equal distances lead to the start of the cycle
  let tail = 0;
  while (entry !== slow) {
    entry = f(entry);
    slow = f(slow);
    tail++;
  }
  let length = 1;          // phase 3: walk once around the cycle
  for (let x = f(entry); x !== entry; x = f(x)) length++;
  return { start: entry, tail, length };
}
