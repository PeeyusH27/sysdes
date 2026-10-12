function jump(nums) {
  let jumps = 0;
  let end = 0;       // furthest index reachable with `jumps` jumps
  let farthest = 0;  // furthest index reachable with one more jump
  for (let i = 0; i < nums.length - 1; i++) { // no jump is needed from the last index
    farthest = Math.max(farthest, i + nums[i]);
    if (i === end) { // every index reachable with `jumps` jumps has been scanned
      jumps++;
      end = farthest;
    }
  }
  return jumps;
}
