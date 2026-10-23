// Template 5: auxiliary state. Store, with every pushed value, the answer for "everything below me":
// the entry never changes while it lives, so pop needs no repair. O(1) push, pop, top, min and max.
export class MinMaxStack {
  constructor() {
    this.items = []; // [value, min so far, max so far]
  }

  push(val) {
    const top = this.items[this.items.length - 1];
    this.items.push([val, top ? Math.min(val, top[1]) : val, top ? Math.max(val, top[2]) : val]);
  }

  pop() {
    return this.items.pop()[0];
  }

  top() {
    return this.items[this.items.length - 1][0];
  }

  getMin() {
    return this.items[this.items.length - 1][1];
  }

  getMax() {
    return this.items[this.items.length - 1][2];
  }
}
