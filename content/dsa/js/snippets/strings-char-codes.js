// Lowercase letters are codes 97..122, uppercase 65..90, digits 48..57.
console.log('a'.charCodeAt(0), 'z'.charCodeAt(0), 'A'.charCodeAt(0), '0'.charCodeAt(0)); // 97 122 65 48
console.log(String.fromCharCode(99), String.fromCharCode(65 + 25)); // c Z

// Letter -> index 0..25 and back.
const idx = (ch) => ch.charCodeAt(0) - 97;
console.log(idx('a'), idx('e'), String.fromCharCode(97 + 4));      // 0 4 e
console.log('7'.charCodeAt(0) - 48, Number('7'));                  // 7 7: digit character -> number

// Shift letters by k, wrapping past 'z' (Caesar cipher).
const shift = (s, k) => [...s].map((ch) => String.fromCharCode(97 + ((idx(ch) + k) % 26))).join('');
console.log(shift('xyz', 3));                                      // abc

// The array of 26: letter counts in O(1) extra space, faster than a Map.
function isAnagram(a, b) {
  if (a.length !== b.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < a.length; i++) {
    count[a.charCodeAt(i) - 97]++;
    count[b.charCodeAt(i) - 97]--;
  }
  return count.every((c) => c === 0);
}
console.log(isAnagram('listen', 'silent'), isAnagram('rat', 'car')); // true false

// The counts joined into a string make an O(k) grouping key (no sorting needed).
function signature(word) {
  const count = new Array(26).fill(0);
  for (const ch of word) count[idx(ch)]++;
  return count.join(',');
}
console.log(signature('eat') === signature('tea'), signature('eat') === signature('tan')); // true false
