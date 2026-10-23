Design a way to turn a binary tree into a **string** and back:

- `serialize(root)` returns a string describing the tree.
- `deserialize(data)` takes that string and returns the root of a tree that is identical to the original, with the same shape and the same values at every position.

The format is up to you, as long as `deserialize` needs nothing except the string `serialize` produced. Node values may be negative or repeat. The tree may be empty.

The tests call `roundTrip(root)`, which must return the pair `[serialize(root), deserialize(serialize(root))]`. A test passes when the first item is a string and the second is a tree equal to the input. In JavaScript the starter has `serialize` and `deserialize` stubs and the `roundTrip` wiring already written; in Python, define all three functions yourself.

### Constraints

- The tree has between `0` and `10^4` nodes.
- `-1000 <= Node.val <= 1000`
