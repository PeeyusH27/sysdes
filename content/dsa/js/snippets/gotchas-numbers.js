// 1. == converts types before comparing. Use === everywhere.
console.log(0 == '', '1' == 1, null == undefined, 0 === ''); // true true true false

// 2. NaN is not equal to anything, itself included.
const x = NaN;
console.log(x === NaN, Number.isNaN(x)); // false true

// 3. Decimal fractions are not exact in binary floating point.
console.log(0.1 + 0.2 === 0.3, 0.1 + 0.2);             // false 0.30000000000000004
console.log(Math.abs(0.1 + 0.2 - 0.3) < 1e-9);          // true: compare with a tolerance

// 4. / is real division. Truncate or floor explicitly.
console.log(7 / 2, Math.floor(7 / 2), Math.trunc(-7 / 2), Math.floor(-7 / 2)); // 3.5 3 -3 -4

// 5. % keeps the sign of the left operand.
console.log(-7 % 3, ((-7 % 3) + 3) % 3); // -1 2: the second form is always in 0 .. 2

// 6. Object keys are strings, so numbers come back as strings.
const counts = {};
for (const n of [3, 1, 3]) counts[n] = (counts[n] ?? 0) + 1;
console.log(Object.keys(counts), Object.keys(counts)[0] + 1); // ['1', '3'] 11
const freq = new Map();
for (const n of [3, 1, 3]) freq.set(n, (freq.get(n) ?? 0) + 1);
console.log([...freq.keys()], [...freq.keys()][0] + 1);       // [3, 1] 4
