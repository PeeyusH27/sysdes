// Collect pieces in an array and join once: linear in every engine.
function compress(s) {                  // 'aaabcc' -> 'a3b1c2'
  const parts = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    parts.push(s[i], j - i);
    i = j;
  }
  return parts.join('');
}
console.log(compress('aaabcc'));        // a3b1c2

// Split, transform the array, join.
console.log('  the sky  is blue '.trim().split(/\s+/).reverse().join(' ')); // blue is sky the

// An array used as a stack of characters, joined at the end.
function removeAdjacentPairs(s) {
  const stack = [];
  for (const ch of s) {
    if (stack.at(-1) === ch) stack.pop();
    else stack.push(ch);
  }
  return stack.join('');
}
console.log(removeAdjacentPairs('abbaca')); // ca

// Reverse in place: two pointers over a character array.
const chars = [...'stressed'];
for (let l = 0, r = chars.length - 1; l < r; l++, r--) [chars[l], chars[r]] = [chars[r], chars[l]];
console.log(chars.join(''));            // desserts
