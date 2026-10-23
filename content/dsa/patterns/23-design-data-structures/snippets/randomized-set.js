// Template 4: O(1) insert, remove and random pick. An array makes random picks easy, a map from value to index
// makes removal easy. Remove by copying the LAST element into the hole, then pop.
export class RandomizedSet {
  constructor() {
    this.items = [];
    this.index = new Map(); // value -> position in items
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
    this.items[i] = last; // fill the hole
    this.index.set(last, i); // tell the map where the moved element lives now
    this.items.pop();
    this.index.delete(val); // after the set above: if val was last, it must end up deleted
    return true;
  }

  getRandom() {
    return this.items[Math.floor(Math.random() * this.items.length)];
  }
}
