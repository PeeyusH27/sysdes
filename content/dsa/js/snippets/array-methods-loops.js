const nums = [4, 8, 15, 16];

// for: you control the index (go backwards, step by 2, look at neighbours).
const backwards = [];
for (let i = nums.length - 1; i >= 0; i--) backwards.push(nums[i]);
console.log(backwards);                  // [16, 15, 8, 4]

// for...of: the values themselves; break and continue work.
const small = [];
for (const x of nums) {
  if (x > 10) break;
  small.push(x);
}
console.log(small);                      // [4, 8]

// for...in: KEYS, as strings. It's meant for objects, not arrays.
const keys = [];
for (const k in nums) keys.push(k);
console.log(keys);                       // ['0', '1', '2', '3']
console.log(keys[1] + 1);                // 11: string concatenation, not 2

// forEach can't stop early: return only ends the current callback.
let calls = 0;
nums.forEach((x) => {
  calls++;
  if (x === 8) return;                   // behaves like continue, never like break
});
console.log(calls);                      // 4: every element was still visited
