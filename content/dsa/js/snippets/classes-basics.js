class Interval {
  constructor(start, end) {              // runs on `new`: set up the fields
    this.start = start;
    this.end = end;
  }
  get length() {                         // getter: read as iv.length, no parentheses
    return this.end - this.start;
  }
  overlaps(other) {                      // method: shared by every instance
    return this.start <= other.end && other.start <= this.end;
  }
  static fromPair([start, end]) {        // static: called on the class, not an instance
    return new Interval(start, end);
  }
}
const a = new Interval(1, 5);
const b = Interval.fromPair([4, 9]);
console.log(a.length, a.overlaps(b), b); // 4 true Interval { start: 4, end: 9 }

// Private #fields can only be touched inside the class body.
class Stack {
  #items = [];                           // a field: every instance gets its own array
  push(x) {
    this.#items.push(x);
    return this;                         // returning this lets calls chain
  }
  pop() {
    return this.#items.pop();
  }
  peek() {
    return this.#items.at(-1);
  }
  get size() {
    return this.#items.length;
  }
}
const s = new Stack().push(1).push(2).push(3);
console.log(s.pop(), s.peek(), s.size);  // 3 2 2
console.log(Object.keys(s));             // []: private fields are invisible from outside

// Forgetting `new` is a TypeError, not a silent bug.
try {
  Stack();
} catch (e) {
  console.log(e.name);                   // TypeError
}
