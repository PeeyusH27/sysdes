You are given a string `s` that contains only the bracket characters `(`, `)`, `[`, `]`, `{` and `}`.

Decide whether the brackets are **balanced**:

- every opening bracket is eventually closed by a bracket of the **same type**,
- brackets close in the **reverse order** they were opened, so an inner pair closes before the pair around it, and
- no closing bracket appears without an open bracket waiting for it.

Return `true` if `s` is balanced and `false` otherwise. An empty string is balanced.

### Constraints

- `0 <= s.length <= 10^4`
- `s` consists only of the characters `()[]{}`.
