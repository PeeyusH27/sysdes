// / always returns a float. Choose the rounding the problem needs.
console.log(7 / 2, Math.floor(7 / 2), Math.trunc(7 / 2)); // 3.5 3 3
// With negatives they differ: floor rounds down, trunc rounds toward zero.
console.log(Math.floor(-7 / 2), Math.trunc(-7 / 2));       // -4 -3

// | 0 and ~~ also truncate, but only for results inside the 32-bit range.
console.log((-7 / 2) | 0, ~~(-7 / 2));                     // -3 -3
console.log(3e9 | 0);                                      // -1294967296: wrapped around

// Ceiling division: how many groups of k do n items need?
const n = 10, k = 3;
console.log(Math.ceil(n / k), Math.floor((n + k - 1) / k)); // 4 4

// Binary search midpoint: all three agree for ordinary indices...
let lo = 0, hi = 9;
console.log(lo + Math.floor((hi - lo) / 2), Math.floor((lo + hi) / 2), (lo + hi) >> 1); // 4 4 4
// ...but >> 1 breaks once lo + hi reaches 2^31 (searching a big answer range).
lo = 2 ** 30; hi = 2 ** 31;
console.log(Math.floor((lo + hi) / 2), (lo + hi) >> 1);    // 1610612736 -536870912

// Math.round sends .5 up (toward +Infinity), not away from zero.
console.log(Math.round(2.5), Math.round(-2.5));            // 3 -2
