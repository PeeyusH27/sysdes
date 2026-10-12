// Counting sort: O(n + k) for integers in a small range 0..k.
function countingSort(nums, maxValue) {
  const count = new Array(maxValue + 1).fill(0);
  for (const x of nums) count[x]++;
  const out = [];
  for (let v = 0; v <= maxValue; v++) {
    for (let c = 0; c < count[v]; c++) out.push(v);
  }
  return out;
}
console.log(countingSort([3, 0, 2, 3, 1, 0], 3));    // [0, 0, 1, 2, 3, 3]

// Bucket by frequency: the k most frequent values in O(n), no comparison sort at all.
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) ?? 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []); // index = frequency
  for (const [x, f] of freq) buckets[f].push(x);
  const res = [];
  for (let f = nums.length; f > 0 && res.length < k; f--) res.push(...buckets[f]);
  return res.slice(0, k);
}
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2));    // [1, 2]
