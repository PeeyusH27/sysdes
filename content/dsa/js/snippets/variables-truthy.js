// The only falsy values. Everything else is truthy, including [], {} and '0'.
const falsy = [false, 0, -0, 0n, '', null, undefined, NaN];
console.log(falsy.every((v) => !v));        // true
console.log(Boolean([]), Boolean({}), Boolean('0')); // true true true

// === compares without converting types; == converts first, with irregular rules.
console.log(1 === '1', 1 == '1');           // false true
console.log(0 == '', 0 == '0', '' == '0');  // true true false: not even transitive
console.log(null == undefined, null == 0);  // true false: the one useful == (x == null)

// Arrays and objects compare by reference, never by contents. NaN never equals anything.
console.log([1, 2] === [1, 2]);             // false
console.log(NaN === NaN, Number.isNaN(NaN)); // false true

// The DSA trap: index 0, count 0 and value 0 are all falsy.
const nums = [7, 8, 9];
const idx = nums.indexOf(7);                // 0
if (idx) console.log('found');              // never runs
if (idx !== -1) console.log('found at', idx); // found at 0

const firstSeenAt = new Map([['a', 0]]);
console.log(firstSeenAt.get('a') ? 'seen' : 'new'); // new  (wrong: 'a' was seen at index 0)
console.log(firstSeenAt.has('a') ? 'seen' : 'new'); // seen
