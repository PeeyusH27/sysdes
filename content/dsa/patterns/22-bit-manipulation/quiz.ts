import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "What does XOR-ing all the values of [a, b, a, c, b] together return?",
    options: ["a ^ b ^ c", "c", "0"],
    answer: 1,
    explain: "XOR is commutative and associative, so regroup it as (a ^ a) ^ (b ^ b) ^ c. Each pair is 0, and 0 ^ c = c. This is why XOR finds the one value without a twin in O(1) space.",
  },
  {
    q: "n = 40, which is 101000 in binary. What is n & (n - 1)?",
    options: ["39 (100111)", "32 (100000)", "8 (001000)"],
    answer: 1,
    explain: "n - 1 = 100111: the lowest 1 (the 8 bit) became 0 and the zeros below it became 1s. AND-ing with n keeps the higher bits and wipes the rest, so the lowest set bit is removed: 32. (8 is n & -n, the lowest set bit on its own.)",
  },
  {
    q: "In JavaScript, 1 << 31 evaluates to -2147483648. How do you get the unsigned value 2147483648 from it?",
    options: ["Math.abs(1 << 31)", "(1 << 31) >>> 0", "(1 << 31) | 0"],
    answer: 1,
    explain: "Bitwise operators produce signed 32-bit integers, and bit 31 is the sign bit. >>> 0 shifts by nothing but returns the same 32 bits read as unsigned. | 0 keeps the value signed, and Math.abs only happens to work here; it gives the wrong bits for other negative values such as -1.",
  },
];
