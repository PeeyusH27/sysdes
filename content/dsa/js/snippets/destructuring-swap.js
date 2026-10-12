// Array destructuring unpacks by position.
const [first, second] = [10, 20, 30];
console.log(first, second);               // 10 20
const [, , third] = [10, 20, 30];         // skip positions with empty slots
console.log(third);                       // 30
const [x = 0, y = 0] = [5];               // defaults fill missing positions
console.log(x, y);                        // 5 0
const [head, ...tail] = [1, 2, 3, 4];     // rest collects the remainder into a new array
console.log(head, tail);                  // 1 [2, 3, 4]

// Swap two variables, or two array slots, in one line.
let a = 1, b = 2;
[a, b] = [b, a];
console.log(a, b);                        // 2 1
const nums = [5, 6, 7];
[nums[0], nums[2]] = [nums[2], nums[0]];
console.log(nums);                        // [7, 6, 5]

// The semicolon pitfall: without a semicolon, a line starting with [ continues the
// previous line. These two lines run as  const arr = [9, 8][a, b] = [b, a]
const arr = [9, 8]
[a, b] = [b, a]
console.log(arr, a, b);                   // [1, 2] 2 1: arr got the pair, and nothing was swapped
