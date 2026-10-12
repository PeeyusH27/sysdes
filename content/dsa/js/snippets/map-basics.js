const ages = new Map();
ages.set('ada', 36).set('alan', 41);      // set returns the map, so calls chain
console.log(ages.get('ada'));             // 36
console.log(ages.get('grace'));           // undefined: missing keys are not an error
console.log(ages.has('alan'), ages.size); // true 2

ages.set('ada', 37);                      // same key: overwrites, size stays 2
ages.delete('alan');
console.log([...ages]);                   // [['ada', 37]]: entries in insertion order

// Any value can be a key, and keys keep their type (1 and '1' are different keys).
const m = new Map([[1, 'number one'], ['1', 'string one']]);
console.log(m.get(1), '|', m.get('1'));   // number one | string one

for (const [name, age] of ages) console.log(name, age); // iterate entries directly
