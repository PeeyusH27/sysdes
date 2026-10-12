function partitionLabels(s) {
  const last = new Map();
  for (let i = 0; i < s.length; i++) last.set(s[i], i); // last position of every letter
  const sizes = [];
  let start = 0;
  let end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i])); // this piece must reach the last copy of s[i]
    if (i === end) {                     // nothing in s[start..i] appears later: cut here
      sizes.push(end - start + 1);
      start = i + 1;
    }
  }
  return sizes;
}
