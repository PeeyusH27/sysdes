function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let best = 0;
  while (left < right) {
    const area = (right - left) * Math.min(height[left], height[right]);
    best = Math.max(best, area);
    // The shorter line can't do better with any narrower partner: discard it.
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}
