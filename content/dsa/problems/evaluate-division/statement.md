You are given some facts of the form "variable A divided by variable B equals a number". Variables are strings, and `equations[i] = [A, B]` together with `values[i] = k` means `A / B = k`. Every `k` is a positive number.

Then you are given a list of `queries`. For each query `[C, D]`, compute `C / D` using only the given facts, which you may combine freely (for example from `a / b = 2` and `b / c = 3` you can conclude `a / c = 6`, and also `b / a = 1/2`).

Return one number per query. If an answer cannot be determined (a variable never appears in the equations, or the two variables are not linked), the answer is `-1`. A known variable divided by itself is `1`; an unknown variable divided by itself is `-1`.

Answers are compared with a small tolerance (about `1e-5`), so floating-point results are fine. In Python, `/` already gives a float.

### Constraints

- `1 <= equations.length <= 20`, `values.length === equations.length`, `1 <= queries.length <= 20`
- Variable names are non-empty lowercase or alphanumeric strings.
- `0 < values[i] <= 20`, and the facts do not contradict each other.
