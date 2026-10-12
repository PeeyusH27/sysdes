function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0); // count[0] is 'a', count[25] is 'z'
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++; // s supplies one copy of this letter
    count[t.charCodeAt(i) - 97]--; // t uses one copy
  }
  return count.every((c) => c === 0);
}
