Design a structure that counts how many times each string has been seen and can always report a **most frequent** and a **least frequent** string, with every operation in O(1).

Implement the class `AllOne`:

- `new AllOne()` creates an empty structure.
- `inc(key)` increases the count of `key` by 1. A key that is not present starts at 1.
- `dec(key)` decreases the count of `key` by 1. When the count reaches 0 the key is removed. `dec` is only called for keys that are present.
- `getMaxKey()` returns a key with the highest count, or `""` if the structure is empty.
- `getMinKey()` returns a key with the lowest count, or `""` if the structure is empty.

If several keys tie for the highest (or lowest) count, any of them is a correct answer. To keep the tests exact, they only call `getMaxKey` and `getMinKey` when the answer is unique.

Each test is a sequence of calls. The first call creates the object. Calls that return nothing are shown as `null` in the expected output, and their return value isn't checked.

### Constraints

- Keys are short lowercase strings, at most 10 characters.
- At most `5 * 10^4` calls in total.
