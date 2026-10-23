import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "In a sorted array, nums[left] + nums[right] is smaller than the target. Why is it safe to move left forward?",
    options: [
      "Because the array might contain duplicates",
      "Because nums[left] plus any value at or before right is too small, so nums[left] can't be in any answer",
      "Because moving right would skip the answer",
    ],
    answer: 1,
    explain: "nums[right] is the biggest partner left. If even that is too small for nums[left], every other partner is too, so nums[left] is out for good.",
  },
  {
    q: "You must remove duplicates from a sorted array in place with O(1) extra space. Which pointer setup fits?",
    options: ["Opposite ends moving inward", "A read pointer scanning and a write pointer marking the kept prefix", "A hash set of values seen so far"],
    answer: 1,
    explain: "Same-direction read/write pointers compact the array in one pass. A hash set works but uses O(n) space.",
  },
  {
    q: "What is the time complexity of 3Sum with sort + two pointers?",
    options: ["O(n log n)", "O(n²)", "O(n³)"],
    answer: 1,
    explain: "The sort is O(n log n), but each of the n choices of the first number runs an O(n) two-pointer walk: O(n²) overall.",
  },
];
