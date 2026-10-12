### Intuition

Each child has two separate constraints: one with the left neighbour and one with the right neighbour. Trying to satisfy both at once in a single pass fails, because when you reach a child you don't yet know how long the downhill run after it is. So handle **one direction at a time**:

- **Left pass.** Walking left to right, if a child is rated higher than the left neighbour, give them one more candy than that neighbour; otherwise give 1. Now every "beat my left neighbour" rule holds, using the fewest candies for that rule alone: the count at each child is the length of the rising run that ends there.
- **Right pass.** Walking right to left, if a child is rated higher than the right neighbour, they need at least one more than that neighbour. Raise them to `max(current, right + 1)`. Taking the max keeps the left rule satisfied.

Each child ends up with the larger of two lower bounds (the rising run from the left and the rising run from the right), and no child can get less than either, so the total is the minimum.

### Step by step

1. Fill `candies` with 1 for every child.
2. For `i` from 1 to `n - 1`: if `ratings[i] > ratings[i - 1]`, set `candies[i] = candies[i - 1] + 1`.
3. For `i` from `n - 2` down to 0: if `ratings[i] > ratings[i + 1]`, set `candies[i] = Math.max(candies[i], candies[i + 1] + 1)`.
4. Return the sum of `candies`.

### Dry run: `ratings = [1, 3, 2, 2, 1]`

| i | rating | after left pass | after right pass |
|---|---|---|---|
| 0 | 1 | 1 | 1 |
| 1 | 3 | 2 | max(2, 1 + 1) = 2 |
| 2 | 2 | 1 | 1 |
| 3 | 2 | 1 | max(1, 1 + 1) = 2 |
| 4 | 1 | 1 | 1 |

Total: 1 + 2 + 1 + 2 + 1 = 7. The two children rated 2 get different amounts, which is fine: equal neighbours have no rule.

A peak with a longer slope on one side shows why the max matters. For `[1, 2, 3, 2, 1, 0]` the left pass gives `[1, 2, 3, 1, 1, 1]` and the right pass raises the right slope to `3, 2, 1` and the peak to `max(3, 4) = 4`: `[1, 2, 4, 3, 2, 1]`, 13 candies.

### Why it works

A rising run of length `k` ending at a child forces at least `k` candies on that child (1, then at least 2, then at least 3…). That holds for the run coming from the left and for the run coming from the right, so every child needs at least the larger of the two. The two passes give each child exactly that larger value, and both rules then hold. Every child is at its lower bound, so no valid assignment uses fewer candies.

### Common mistakes

- Assigning in the right pass without the max: in `[1, 2, 3, 1]` the left pass gives the 3-rated child 3 candies, and overwriting it with `1 + 1 = 2` ties it with the 2-rated child on its left.
- Giving equal neighbours equal candy: `[1, 2, 2]` needs only 1 + 2 + 1 = 4.
- Trying to fix everything in one left-to-right pass: a long downhill run forces you to go back and raise earlier children, which is easy to get wrong and can take O(n²).

### Other ways to solve it

There is an O(1)-space single pass that counts the lengths of rising and falling slopes and adds triangular numbers, adjusting the peak when the falling slope outgrows the rising one. It saves the array but is much easier to get wrong in an interview; the two-pass version is the one to write.
