import { firstRepeat } from './seen-set.js'; // @hide
import { canConstruct, countAll } from './frequency.js'; // @hide
import { countPairs } from './complement.js'; // @hide
import { groupBy } from './group-by-key.js'; // @hide
// Edit the inputs and press Run. These are the four templates on this page.
console.log(firstRepeat([4, 7, 2, 9, 7, 1]));          // 7
console.log(countAll('banana'));                       // Map(3) { 'b' => 1, 'a' => 3, 'n' => 2 }
console.log(canConstruct('tooth', 'photo'));           // false: only one t to spend
console.log(countPairs([1, 5, 3, 3, 3, 7], 6));        // 4

const sorted = (w) => [...w].sort().join('');
console.log(groupBy(['tab', 'cat', 'bat', 'act'], sorted)); // [['tab', 'bat'], ['cat', 'act']]
