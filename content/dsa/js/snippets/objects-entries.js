const scores = { ana: 90, ben: 72, cy: 85 };

console.log(Object.keys(scores));     // ['ana', 'ben', 'cy']
console.log(Object.values(scores));   // [90, 72, 85]
console.log(Object.entries(scores));  // [['ana', 90], ['ben', 72], ['cy', 85]]
console.log(Object.keys(scores).length); // 3: there is no .size, and this is O(n)

// Loop over pairs with destructuring.
let best = null;
for (const [name, score] of Object.entries(scores)) {
  if (best === null || score > scores[best]) best = name;
}
console.log(best);                    // ana

// fromEntries turns pairs back into an object: filter or transform in one line.
const passed = Object.fromEntries(Object.entries(scores).filter(([, s]) => s >= 80));
console.log(passed);                  // { ana: 90, cy: 85 }
const curved = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v + 5]));
console.log(curved);                  // { ana: 95, ben: 77, cy: 90 }

// Computed keys and shorthand.
const field = 'age';
const x = 3, y = 4;
const person = { name: 'Ana', [field]: 31, x, y };  // [expr] computes the key; x means x: x
person[`${field}Next`] = 32;                        // brackets read or write any computed key
console.log(person);                  // { name: 'Ana', age: 31, x: 3, y: 4, ageNext: 32 }
console.log(person.field, person[field]); // undefined 31: .field looks for a key named "field"
