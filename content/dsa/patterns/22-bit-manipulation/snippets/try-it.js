import { clearBit, getBit, reverseBits, setBit } from './bit-masks.js'; // @hide
import { missingNumber, twoSingles, xorAll } from './xor-tricks.js'; // @hide
import { isPowerOfTwo, lowestSetBit, popcount } from './lowest-bit.js'; // @hide
import { subsets } from './subsets-bitmask.js'; // @hide
// Edit the numbers and press Run. The functions are the templates above.
console.log((44).toString(2), getBit(44, 2), getBit(44, 0)); // 101100 1 0
console.log(setBit(44, 0), clearBit(44, 5));                // 45 12

console.log(xorAll([5, 9, 3, 12, 3, 5, 12]));                // 9
console.log(missingNumber([4, 0, 1, 3]));                    // 2
console.log(twoSingles([1, 2, 1, 3, 2, 5]));                 // [3, 5]

console.log(popcount(44), isPowerOfTwo(64), lowestSetBit(44)); // 3 true 4
console.log(subsets(['a', 'b', 'c']).length);                // 8

// The 32-bit rule: bitwise results are signed 32-bit integers.
console.log(1 << 31, (1 << 31) >>> 0);                       // -2147483648 2147483648
console.log(reverseBits(1));                                 // 2147483648
console.log(~5, 7.9 | 0, 2 ** 32 | 0);                       // -6 7 0
