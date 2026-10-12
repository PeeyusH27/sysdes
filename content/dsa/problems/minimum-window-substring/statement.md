You are given two strings `s` and `t`. Return the **shortest substring** of `s` that contains every character of `t`, **including repeats**: if `t` has two `a`s, the substring needs at least two `a`s. Other characters may appear in the substring too.

If no such substring exists, return the empty string `""`. Characters are case-sensitive. If several shortest substrings exist, return any one of them.

### Constraints

- `1 <= s.length, t.length <= 10^5`
- `s` and `t` contain uppercase and lowercase English letters.
- Aim for O(m + n) time.
