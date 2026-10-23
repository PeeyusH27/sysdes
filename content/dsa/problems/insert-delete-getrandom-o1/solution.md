### Intuition

Two structures each do half the job. A **hash set** gives O(1) insert, remove and membership, but you cannot pick "the 3rd member" from it. An **array** gives O(1) random pick (a random index) and O(1) append, but removing from the middle shifts everything, which is O(n).

Combine them: keep the values in an array, and a map from each value to its index in that array. The map answers "where is it?" so removal can jump straight to the slot. The only problem left is the hole a removal leaves, and there is a cheap fix: **fill the hole with the last element**, then drop the last slot.

### Step by step

1. Keep `items` (an array) and `index` (a `Map` from value to position in `items`).
2. `insert(val)`: if `index` has it, return `false`. Otherwise record `index.set(val, items.length)`, push it, return `true`.
3. `remove(val)`: if `index` lacks it, return `false`. Otherwise:
   1. `i = index.get(val)` and `last = items[items.length - 1]`.
   2. Write `last` into `items[i]` and set `index.set(last, i)`.
   3. `items.pop()` and `index.delete(val)`.
4. `getRandom()`: return `items[Math.floor(Math.random() * items.length)]`.

### Dry run: insert 4, 5, 6 then remove 4

| step | items | index | note |
|---|---|---|---|
| insert 4, 5, 6 | [4, 5, 6] | 4:0, 5:1, 6:2 | |
| remove 4 | i = 0, last = 6 | | copy 6 into slot 0 |
| after | [6, 5] | 6:0, 5:1 | pop the old last slot, delete key 4 |

### Why it works

Order inside the array is irrelevant for a set, so we can freely move the last element. Moving it keeps the array **dense** (no holes), which is what makes a random index land on a real member with equal probability. Every step is a constant number of array and map operations.

### Edge cases

- Removing the **last** element: `i` equals the last index, `last` is the element itself. Do the `set` before the `delete`, so the final `delete` leaves nothing behind.
- Removing the only element leaves empty structures.
- `0` and negative numbers are ordinary values; check membership with `has`, never with truthiness.

### Common mistakes

- Deleting from `index` first, then setting `index.set(last, i)` when `last === val`: that resurrects the removed value.
- Using `items.splice(i, 1)`: it works but is O(n).
- Forgetting to update the **moved** element's index in the map.
