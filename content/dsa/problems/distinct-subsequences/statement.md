Given two strings `s` and `t`, return the number of **distinct subsequences of `s` that equal `t`**. A subsequence keeps the original order of characters but may skip any of them. Two subsequences are different if they use different **positions** of `s`, even when the resulting text is the same.

For example, `"rabbit"` can be taken from `"rabbbit"` in 3 ways, one for each `b` that is left out.

The empty string `t` can be formed in exactly one way (choose nothing). The answer fits in a 32-bit signed integer.

### Constraints

- `0 <= s.length, t.length <= 1000`
- `s` and `t` consist of English letters.
