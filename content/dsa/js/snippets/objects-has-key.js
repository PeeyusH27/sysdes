const counts = { a: 1, zero: 0, nothing: undefined };

// Three ways to ask "is this key here?", with different answers.
console.log('zero' in counts, Object.hasOwn(counts, 'zero'), counts.zero !== undefined); // true true true
console.log('nothing' in counts, Object.hasOwn(counts, 'nothing'), counts.nothing !== undefined); // true true false
console.log('toString' in counts, Object.hasOwn(counts, 'toString')); // true false: in sees inherited keys

// Truthiness is the worst test: a stored 0 looks missing.
console.log(counts.zero ? 'present' : 'missing'); // missing

// Every plain object already "has" constructor, toString, valueOf...
const freq = {};
for (const w of ['constructor', 'a']) freq[w] = (freq[w] || 0) + 1;
console.log(typeof freq.constructor, freq.a);     // string 1: the function Object got a '1' glued on

// Object.create(null) makes a dictionary with no inherited keys at all.
const dict = Object.create(null);
for (const w of ['constructor', 'a']) dict[w] = (dict[w] ?? 0) + 1;
console.log(dict.constructor, dict.a, 'toString' in dict); // 1 1 false
