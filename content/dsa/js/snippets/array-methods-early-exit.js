const nums = [2, 4, 7, 8, 10];
let checks = 0;
const isOdd = (x) => {
  checks++;
  return x % 2 !== 0;
};

// some, every, find and findIndex stop as soon as the answer is known.
console.log(nums.some(isOdd), checks);              // true 3: stopped at 7
checks = 0;
console.log(nums.every((x) => !isOdd(x)), checks);  // false 3: stopped at 7 again
console.log(nums.find((x) => x > 5), nums.findIndex((x) => x > 5));   // 7 2
console.log(nums.find((x) => x > 50), nums.findIndex((x) => x > 50)); // undefined -1

// Empty arrays: every is true (no counterexample), some is false.
console.log([].every((x) => x > 0), [].some((x) => x > 0)); // true false

// Index and value together, with early exit.
for (const [i, x] of nums.entries()) {
  if (x > 7) {
    console.log(`first value above 7 is ${x} at index ${i}`); // first value above 7 is 8 at index 3
    break;
  }
}
