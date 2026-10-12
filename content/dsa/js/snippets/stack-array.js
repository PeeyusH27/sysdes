// An array is a stack: push and pop work on the end in O(1).
const stack = [];
stack.push(1, 2, 3);                     // push accepts several items
console.log(stack.pop(), stack.at(-1), stack.length); // 3 2 2: pop removes, at(-1) peeks
console.log([].pop(), [].at(-1));        // undefined undefined: no error on an empty stack

// Classic use: match brackets. The stack holds what is still waiting to be closed.
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const open = [];
  for (const ch of s) {
    if (ch in pairs) {
      if (open.pop() !== pairs[ch]) return false; // wrong opener, or none left
    } else {
      open.push(ch);
    }
  }
  return open.length === 0;              // anything left was never closed
}
console.log(isValid('([]{})'), isValid('(]'), isValid('(('));  // true false false
