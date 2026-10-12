function twoSumSorted(numbers, target) {
  let left = 0;
  let right = numbers.length - 1;
  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;   // numbers[left] is too small for any partner
    else right--;               // numbers[right] is too big for any partner
  }
  return [-1, -1];              // unreachable when an answer is guaranteed
}
