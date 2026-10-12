// A queue on top of an array and a head index. push() is O(1) and so is shift() here: it only moves head.
// Array.prototype.shift() moves every remaining element down one slot, so a big BFS that uses it is O(n²).
export class Queue {
  #items = [];
  #head = 0;

  push(item) {
    this.#items.push(item);
  }

  shift() {
    if (this.#head === this.#items.length) return undefined;
    const item = this.#items[this.#head++];
    if (this.#head > 1024 && this.#head * 2 > this.#items.length) {
      this.#items = this.#items.slice(this.#head); // now and then, drop the used prefix to free memory
      this.#head = 0;
    }
    return item;
  }

  get size() {
    return this.#items.length - this.#head;
  }
}
