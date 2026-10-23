Design a collection of distinct integers that supports adding, removing and picking a **uniformly random member**, each in O(1) average time.

Implement the class `RandomizedSet`:

- `new RandomizedSet()` creates an empty set.
- `insert(val)` adds `val` if it is not there and returns `true`; if it was already there it returns `false`.
- `remove(val)` removes `val` and returns `true`; if it was not there it returns `false`.
- `getRandom()` returns one current member, chosen so that every member is equally likely. It is only called when the set is not empty.

Because `getRandom` is random, a test can only check it when the answer is forced. When the set holds exactly one value, the expected output is that value; when it holds several, the output is `null` and isn't checked. Your code still has to return a valid member.

Each test is a sequence of calls. The first call creates the object.

### Constraints

- `-2^31 <= val <= 2^31 - 1`
- At most `2 * 10^5` calls in total.
