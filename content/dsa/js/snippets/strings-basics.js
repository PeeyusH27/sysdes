const s = 'hello';
console.log(s[0], s.at(-1), s.length);    // h o 5
console.log(s[10], s.charAt(10) === '');  // undefined true: out of range is not an error

// Strings are immutable: methods return a NEW string and leave s alone.
const upper = s.toUpperCase();
console.log(s, upper);                    // hello HELLO
const fixed = 'j' + s.slice(1);           // "change" the first letter by building a new string
console.log(fixed, s);                    // jello hello

// To edit several characters, go through an array and join once.
const chars = [...s];
[chars[0], chars[4]] = [chars[4], chars[0]];
console.log(chars.join(''));              // oellh

// for...of walks characters; indexing walks UTF-16 code units (an emoji is two).
for (const ch of 'hi!') console.log(ch, ch.charCodeAt(0));
// h 104
// i 105
// ! 33
console.log('😀'.length, [...'😀'].length); // 2 1
