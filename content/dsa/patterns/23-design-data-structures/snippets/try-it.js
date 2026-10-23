import { LRUCache } from './lru-cache.js'; // @hide
import { LFUCache } from './lfu-cache.js'; // @hide
import { TimeMap } from './time-map.js'; // @hide
import { RandomizedSet } from './randomized-set.js'; // @hide
import { MinMaxStack } from './min-max-stack.js'; // @hide
// Edit the calls and press Run. These are the templates above.
const lru = new LRUCache(2);
lru.put(1, 1);
lru.put(2, 2);
lru.get(1);
lru.put(3, 3); // evicts key 2
console.log(lru.get(2), lru.get(1), lru.get(3)); // -1 1 3

const lfu = new LFUCache(2);
lfu.put(1, 1);
lfu.put(2, 2);
lfu.get(1);
lfu.put(3, 3); // evicts key 2: fewest uses
console.log(lfu.get(2), lfu.get(1), lfu.get(3)); // -1 1 3

const tm = new TimeMap();
tm.set('love', 'high', 10);
tm.set('love', 'low', 20);
console.log([5, 10, 15, 20].map((t) => tm.get('love', t) || '(none)').join(' ')); // (none) high high low

const set = new RandomizedSet();
console.log(set.insert(5), set.insert(5), set.remove(7), set.remove(5), set.insert(9), set.getRandom()); // true false false true true 9

const s = new MinMaxStack();
[3, 5, 2].forEach((v) => s.push(v));
console.log(s.getMin(), s.getMax()); // 2 5
s.pop();
console.log(s.getMin(), s.getMax()); // 3 5
