function findMedianSortedArrays(nums1, nums2) {
  // Binary search on the shorter array.
  let A = nums1;
  let B = nums2;
  if (A.length > B.length) [A, B] = [B, A];
  const m = A.length;
  const n = B.length;
  const half = (m + n + 1) >> 1; // size of the left half; the extra element (odd total) goes left
  let lo = 0;
  let hi = m;
  while (lo <= hi) {
    const i = (lo + hi) >> 1; // elements taken from A for the left half
    const j = half - i; // elements taken from B
    const aLeft = i > 0 ? A[i - 1] : -Infinity;
    const aRight = i < m ? A[i] : Infinity;
    const bLeft = j > 0 ? B[j - 1] : -Infinity;
    const bRight = j < n ? B[j] : Infinity;
    if (aLeft > bRight) {
      hi = i - 1; // took too many from A
    } else if (bLeft > aRight) {
      lo = i + 1; // took too few from A
    } else {
      const leftMax = Math.max(aLeft, bLeft);
      if ((m + n) % 2 === 1) return leftMax;
      return (leftMax + Math.min(aRight, bRight)) / 2;
    }
  }
  return 0; // unreachable for sorted input
}
