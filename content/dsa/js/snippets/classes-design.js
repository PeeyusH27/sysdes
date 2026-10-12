// A design problem: every operation in O(1), including getMin.
class MinStack {
  constructor() {
    this.items = [];
    this.mins = [];                      // mins.at(-1) is the minimum of everything in items
  }
  push(x) {
    this.items.push(x);
    this.mins.push(this.mins.length ? Math.min(x, this.mins.at(-1)) : x);
  }
  pop() {
    this.mins.pop();
    return this.items.pop();
  }
  top() {
    return this.items.at(-1);
  }
  getMin() {
    return this.mins.at(-1);
  }
}

// How a judge drives a design problem: construct once, then call each method in order.
const ops = ['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'];
const args = [[], [5], [2], [8], [], [], [], []];
const obj = new MinStack(...args[0]);
const outputs = [null];
for (let i = 1; i < ops.length; i++) outputs.push(obj[ops[i]](...args[i]) ?? null);
console.log(outputs);                    // [null, null, null, null, 2, 8, 2, 2]
