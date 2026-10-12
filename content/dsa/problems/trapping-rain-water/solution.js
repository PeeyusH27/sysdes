function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left <= right) {
    leftMax = Math.max(leftMax, height[left]);
    rightMax = Math.max(rightMax, height[right]);
    if (leftMax < rightMax) {
      water += leftMax - height[left];   // left side is the bottleneck: settled
      left++;
    } else {
      water += rightMax - height[right]; // right side is the bottleneck: settled
      right--;
    }
  }
  return water;
}
