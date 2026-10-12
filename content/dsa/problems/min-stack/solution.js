class MinStack {
  constructor() {
    this.items = []; // each entry is [value, minimum of this entry and everything below it]
  }

  push(val) {
    const min = this.items.length ? Math.min(val, this.getMin()) : val;
    this.items.push([val, min]);
  }

  pop() {
    this.items.pop(); // the entry below still knows the minimum without this value
  }

  top() {
    return this.items[this.items.length - 1][0];
  }

  getMin() {
    return this.items[this.items.length - 1][1];
  }
}
