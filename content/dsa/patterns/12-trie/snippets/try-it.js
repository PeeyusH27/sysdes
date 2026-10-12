import { Trie } from './trie.js'; // @hide
import { matchesPattern } from './wildcard.js'; // @hide
import { findAllMatches } from './scan.js'; // @hide
// Add words and queries, then press Run. Trie, matchesPattern and findAllMatches are the templates above.
const trie = new Trie();
for (const word of ['car', 'cart', 'cat', 'care', 'dog']) trie.insert(word);

console.log(trie.search('car'), trie.search('ca'), trie.startsWith('ca')); // true false true
console.log(trie.wordsWithPrefix('car'));                                   // ['car', 'cart', 'care']
console.log(matchesPattern(trie, 'c.t'), matchesPattern(trie, '.o.'));     // true true
console.log(matchesPattern(trie, 'ca..'), matchesPattern(trie, 'd..s'));   // true false
console.log(findAllMatches('scatdogcare', trie));  // [[1, 'cat'], [4, 'dog'], [7, 'car'], [7, 'care']]
