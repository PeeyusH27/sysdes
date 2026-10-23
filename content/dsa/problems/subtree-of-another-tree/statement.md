You are given the roots of two binary trees, `root` and `subRoot`. Return `true` if some node of `root` is the top of a tree that is **identical** to `subRoot`: same shape and same values, including every descendant of that node. Otherwise return `false`.

The tree `root` itself counts as a subtree of itself. A node together with only some of its descendants does not count.

### Constraints

- `root` has between `0` and `2000` nodes, `subRoot` between `1` and `1000`.
- `-10^4 <= Node.val <= 10^4`
- Values may repeat.
