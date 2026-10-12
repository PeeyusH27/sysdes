// A declaration is hoisted: you can call it above the line that defines it.
console.log(square(4));                  // 16

function square(x) {
  return x * x;
}

// A const function (expression or arrow) exists only after its line runs.
try {
  cube(2);
} catch (e) {
  console.log(e.name);                   // ReferenceError: cube is not ready yet
}
const cube = (x) => x * x * x;
console.log(cube(2));                    // 8

// Arrow bodies: no braces returns the expression; braces need an explicit return.
const double = (x) => x * 2;
const doubleBroken = (x) => { x * 2; };
const doubleFixed = (x) => { return x * 2; };
console.log(double(5), doubleBroken(5), doubleFixed(5)); // 10 undefined 10

// Returning an object literal from a concise arrow needs parentheses.
const asPair = (a, b) => ({ a, b });
console.log(asPair(1, 2));               // { a: 1, b: 2 }
