class RandomizedSet {
  constructor() {
    this.items = []; // dense array: any index can be picked at random
    this.index = new Map(); // value -> its position in items
  }

  insert(val) {
    if (this.index.has(val)) return false;
    this.index.set(val, this.items.length);
    this.items.push(val);
    return true;
  }

  remove(val) {
    if (!this.index.has(val)) return false;
    const i = this.index.get(val);
    const last = this.items[this.items.length - 1];
    // Move the last element into the hole, so the array stays dense and pop() is O(1).
    this.items[i] = last;
    this.index.set(last, i);
    this.items.pop();
    this.index.delete(val); // after the set above, so removing the last element itself still works
    return true;
  }

  getRandom() {
    return this.items[Math.floor(Math.random() * this.items.length)];
  }
}
