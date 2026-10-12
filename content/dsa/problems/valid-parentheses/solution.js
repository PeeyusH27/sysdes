function isValid(s) {
  const partner = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const stack = []; // opening brackets that are still waiting to be closed
  for (const ch of s) {
    if (partner.has(ch)) {
      // A closer must match the most recently opened bracket. pop() on an empty stack gives undefined: a mismatch.
      if (stack.pop() !== partner.get(ch)) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0; // anything left was opened and never closed
}
