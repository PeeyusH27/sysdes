### Intuition

A cache has two jobs that pull in different directions. Finding a key fast wants a **hash map**. Knowing *which entry is the oldest* wants an **ordered list**. A map alone has no useful order; a list alone needs O(n) to find a key.

So use both, tied together: a list keeps the entries in order of use (most recent at the front), and the map goes from each key straight to its **list node**. With a *doubly* linked list, a node can unlink itself in O(1) because it knows both neighbours, so "move this entry to the front" never searches.

### Step by step

1. Keep a map `key -> node` and a doubly linked list with two sentinel nodes, `head` and `tail`. The node after `head` is the most recently used; the node before `tail` is the least recently used.
2. `get(key)`:
   1. If the key is not in the map, return `-1`.
   2. Otherwise unlink its node and push it right after `head`, then return its value.
3. `put(key, value)`:
   1. If the key exists, update the node's value and move it to the front.
   2. Otherwise, if the cache is full, unlink the node just before `tail` and delete its key from the map.
   3. Create a node for the new pair, add it to the map and push it to the front.

### Dry run: capacity 2, put 1, put 2, get 1, put 3

| call | list (front → back) | map keys | returns |
|---|---|---|---|
| put(1, 1) | 1 | 1 | |
| put(2, 2) | 2, 1 | 1, 2 | |
| get(1) | 1, 2 | 1, 2 | 1 |
| put(3, 3) | full: evict the back (2), then 3, 1 | 1, 3 | |

### Why it works

The list order is always "most recent to least recent", because every use moves the entry to the front and nothing else reorders it. So the entry before `tail` is by definition the one untouched the longest. Each step is a handful of pointer changes plus one map operation, so it is O(1).

### Common mistakes

- Forgetting that `put` on an **existing** key is also a use: it must move the node to the front, not just overwrite the value.
- Evicting from the list but leaving the key in the map (or the reverse). The node stores its own key precisely so you can delete it from the map.
- Checking capacity **after** inserting a new entry, which evicts one entry too late (or too early when updating an existing key).

### Other ways to solve it

JavaScript's `Map` remembers insertion order. Deleting a key and setting it again moves it to the end, and `map.keys().next().value` is the oldest key. That gives the same O(1) behaviour in about ten lines, and it is a fine answer if the interviewer allows built-ins. Most interviews want the hand-built list, because it shows you understand why it works.
