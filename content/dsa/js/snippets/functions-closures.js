// A closure keeps the variables of the scope it was created in alive.
function makeCounter() {
  let count = 0;                         // private: only the returned function can see it
  return () => ++count;
}
const next = makeCounter();
const other = makeCounter();             // a second, independent count
console.log(next(), next(), next(), other()); // 1 2 3 1

// A memo cache held in a closure: wrap any one-argument function.
function memoize(fn) {
  const cache = new Map();
  return (x) => {
    if (!cache.has(x)) cache.set(x, fn(x));
    return cache.get(x);
  };
}
let calls = 0;
const slowSquare = (x) => {
  calls++;
  return x * x;
};
const fastSquare = memoize(slowSquare);
console.log(fastSquare(9), fastSquare(9), fastSquare(9), 'calls:', calls); // 81 81 81 calls: 1

// let gives each loop iteration its own binding; var shares one variable.
const withLet = [];
for (let i = 0; i < 3; i++) withLet.push(() => i);
const withVar = [];
for (var j = 0; j < 3; j++) withVar.push(() => j);
console.log(withLet.map((f) => f()), withVar.map((f) => f())); // [0, 1, 2] [3, 3, 3]
