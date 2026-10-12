const s = 'interview';
console.log(s.slice(0, 5), s.slice(5), s.slice(-4));  // inter view view
console.log([s.slice(5, 2), s.substring(5, 2)]);      // ['', 'ter']: substring swaps reversed arguments
console.log(s.slice(-4, -1), s.substring(-4));        // vie interview: substring treats negatives as 0

console.log(s.indexOf('e'), s.lastIndexOf('e'), s.indexOf('z'));        // 3 7 -1
console.log(s.includes('view'), s.startsWith('inter'), s.endsWith('w')); // true true true

// split keeps empty fields; trim and split on a regex to get words.
console.log('a,b,,c'.split(','));                     // ['a', 'b', '', 'c']
console.log('  two   spaces '.split(' '));            // ['', '', 'two', '', '', 'spaces', '']
console.log('  two   spaces '.trim().split(/\s+/));   // ['two', 'spaces']
console.log([...'abc'], ['2024', '01', '05'].join('-')); // ['a', 'b', 'c'] 2024-01-05

console.log('ab'.repeat(3), '7'.padStart(3, '0'), 'MiXeD'.toLowerCase()); // ababab 007 mixed
