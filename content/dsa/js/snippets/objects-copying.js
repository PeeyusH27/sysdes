const original = { name: 'grid', size: [2, 3], tags: new Set(['a']) };

// Spread (and Object.assign) copy only the top level.
const shallow = { ...original };
shallow.name = 'copy';                     // top-level property: independent
shallow.size.push(4);                      // nested array: SHARED with original
console.log(original.name, original.size); // grid [2, 3, 4]

// Later properties win, so "a copy with one change" is one line.
const resized = { ...original, size: [5, 5] };
console.log(resized.size, original.size);  // [5, 5] [2, 3, 4]

// structuredClone copies every level, including arrays, Maps, Sets and Dates.
const deep = structuredClone(original);
deep.size.push(9);
deep.tags.add('b');
console.log(original.size, original.tags.size); // [2, 3, 4] 1
console.log(deep.size, deep.tags.size);         // [2, 3, 4, 9] 2

// A JSON round trip is lossy: Sets become {}, Infinity becomes null, undefined disappears.
console.log(JSON.parse(JSON.stringify({ s: new Set([1]), best: Infinity, gone: undefined }))); // { s: {}, best: null }
