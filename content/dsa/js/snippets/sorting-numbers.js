// Without a comparator, sort converts every element to a string and compares those.
console.log([10, 9, 1, 100, 25].sort());                // [1, 10, 100, 25, 9]
console.log([-1, -5, 2].sort());                        // [-1, -5, 2]: '-1' < '-5' as text
console.log([10, 9, 1, 100, 25].sort((a, b) => a - b)); // [1, 9, 10, 25, 100]
console.log([10, 9, 1, 100, 25].sort((a, b) => b - a)); // [100, 25, 10, 9, 1]

// sort mutates the array AND returns it: both names point at the same sorted array.
const nums = [3, 1, 2];
const sorted = nums.sort((a, b) => a - b);
console.log(sorted === nums, nums);                     // true [1, 2, 3]

// toSorted (ES2023) returns a sorted copy and leaves the original alone.
const original = [3, 1, 2];
console.log(original.toSorted((a, b) => a - b), original); // [1, 2, 3] [3, 1, 2]
console.log([...original].sort((a, b) => a - b));          // [1, 2, 3]: copy first, works everywhere
