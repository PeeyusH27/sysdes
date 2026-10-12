// Numbers are exact integers only up to 2^53 - 1.
console.log(Number.MAX_SAFE_INTEGER);             // 9007199254740991
console.log(2 ** 53 === 2 ** 53 + 1);             // true: the + 1 is lost
console.log(Number.isSafeInteger(2 ** 53));       // false

// The classic silent overflow: multiplying two values near 1e9 before taking %.
const MOD = 1_000_000_007;
const a = 999_999_999, b = 999_999_999;
console.log((a * b) % MOD);                                  // 63  (wrong: a * b is about 1e18)
console.log(Number((BigInt(a) * BigInt(b)) % BigInt(MOD)));  // 64  (exact)

// BigInt: exact integers of any size. Literals end in n.
console.log(2n ** 64n);                           // 18446744073709551616n
console.log(7n / 2n, -7n / 2n);                   // 3n -3n: division truncates toward zero
try {
  console.log(2n ** 64n + 1);                     // throws
} catch (e) {
  console.log(e.name);                            // TypeError: BigInt and number don't mix
}
console.log(5n > 3, 2n == 2, 2n === 2);           // true true false: compare freely, but === checks the type
console.log(Number(123n), BigInt(42));            // 123 42n: convert explicitly

// 25! as a number vs as a BigInt.
let asNumber = 1;
let asBig = 1n;
for (let i = 1; i <= 25; i++) {
  asNumber *= i;
  asBig *= BigInt(i);
}
console.log(asNumber);                            // 1.5511210043330986e+25 (approximate)
console.log(asBig);                               // 15511210043330985984000000n (exact)
