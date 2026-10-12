// % is a remainder: the result takes the sign of the LEFT operand.
console.log(7 % 3, -7 % 3, 7 % -3);              // 1 -1 1

// A true modulo always lands in 0..m-1.
const mod = (a, m) => ((a % m) + m) % m;
console.log(mod(-7, 3), mod(7, 3), mod(-3, 3));  // 2 1 0

// Circular arrays: stepping back from index 0.
const ring = ['a', 'b', 'c', 'd', 'e'];
const i = 0;
console.log(ring[(i - 1) % ring.length], ring[mod(i - 1, ring.length)]); // undefined e

// Odd test: compare with 0, because -3 % 2 is -1, not 1.
console.log(-3 % 2 === 1, -3 % 2 !== 0);         // false true

// "Return the answer modulo 1e9 + 7": reduce after every step so values stay small.
const MOD = 1_000_000_007;
let ways = 1;
for (let step = 0; step < 100; step++) ways = (ways * 2) % MOD;
console.log(ways);                               // 976371285 (2^100 mod 1e9+7)
