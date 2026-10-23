A message made of capital letters is encoded as digits using `A = 1, B = 2, ..., Z = 26`. The digits are written one after another with no separators, so the same digit string can often be split into letters in more than one way. For example `"11106"` can be read as `1 1 10 6` or `11 10 6`.

Given a string `s` of digits, return the **number of different ways** to decode it. Codes do not have leading zeros: `"06"` is not `6`, and a lone `0` is not a letter. If no decoding exists, return `0`.

### Constraints

- `1 <= s.length <= 100`
- `s` contains only digits and may start with `0`.
- The answer fits in a 32-bit integer.
