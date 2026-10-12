// Most decimals have no exact binary form, so tiny errors creep in.
console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3);           // 0.30000000000000004 false
const EPS = 1e-9;
console.log(Math.abs(0.1 + 0.2 - 0.3) < EPS);        // true: compare with a tolerance

// toFixed rounds for display and returns a STRING.
const avg = (1 + 2 + 2) / 3;
console.log(avg.toFixed(2), typeof avg.toFixed(2));  // 1.67 string
console.log(avg.toFixed(2) + 1);                     // 1.671: string concatenation
console.log(Number(avg.toFixed(2)) + 1);             // 2.67
console.log((1.005).toFixed(2));                     // 1.00: 1.005 is stored as 1.00499999...

// Parsing: Number() needs the whole string to be numeric; parseInt() reads leading digits.
console.log(Number('42'), Number(' 42 '), Number('42px'), Number(''));    // 42 42 NaN 0
console.log(parseInt('42px', 10), parseInt('3.9', 10), parseInt('', 10)); // 42 3 NaN
console.log(parseInt('1010', 2), parseInt('ff', 16));                     // 10 255

// + on a string concatenates; - converts. Convert explicitly before doing math.
console.log('7' + 1, '7' - 1, Number('7') + 1);      // 71 6 8
