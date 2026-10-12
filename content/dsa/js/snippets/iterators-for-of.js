// for...of works on anything iterable and gives you values.
for (const x of [10, 20]) console.log('array', x);         // array 10, array 20
for (const ch of 'hi') console.log('string', ch);          // string h, string i
for (const [k, v] of new Map([['a', 1]])) console.log('map', k, v); // map a 1
for (const x of new Set(['s'])) console.log('set', x);     // set s

// Need the index too? Iterate entries() and destructure.
for (const [i, x] of ['a', 'b'].entries()) console.log(i, x); // 0 a, 1 b

// Map has keys(), values() and entries(); Set's values() are its items.
const freq = new Map([['x', 3], ['y', 1]]);
console.log([...freq.keys()], [...freq.values()]);          // ['x', 'y'] [3, 1]

// These return one-shot iterators, not arrays.
const keys = freq.keys();
console.log(keys.length, [...keys], [...keys]);             // undefined ['x', 'y'] []

// Plain objects are not iterable: go through Object.entries (or keys / values).
const counts = { a: 2, b: 5 };
try {
  for (const x of counts) console.log(x);
} catch (e) {
  console.log(e.name);                                      // TypeError: counts is not iterable
}
for (const [k, v] of Object.entries(counts)) console.log(k, v); // a 2, b 5
