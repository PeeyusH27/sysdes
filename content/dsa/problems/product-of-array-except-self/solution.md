### Intuition

Multiplying all the other elements for every index is O(n²). Dividing the total product by `nums[i]` is O(n), but it's forbidden, and it breaks as soon as the array contains a 0.

Split the product at `i`:

`answer[i] = (product of everything left of i) × (product of everything right of i)`

Both parts are running products, the multiplicative cousin of prefix sums: a **prefix product** from the left and a **suffix product** from the right. The empty product is 1, just as the empty sum is 0.

To avoid two extra arrays, fill `answer` with the left products in a first pass, then walk from the right with **one variable** holding the right product and multiply it in.

### Step by step

1. Create `answer` with length n.
2. Left pass: set `left = 1`. For `i` from 0 to n - 1: write `answer[i] = left`, **then** update `left *= nums[i]`.
3. Right pass: set `right = 1`. For `i` from n - 1 down to 0: update `answer[i] *= right`, **then** `right *= nums[i]`.
4. Return `answer`.

Writing before multiplying is what keeps `nums[i]` out of its own product.

### Dry run: `nums = [2, 3, 4, 5]`

Left pass:

| i | left before | answer[i] | left after |
|---|---|---|---|
| 0 | 1 | 1 | 2 |
| 1 | 2 | 2 | 6 |
| 2 | 6 | 6 | 24 |
| 3 | 24 | 24 | 120 |

Right pass:

| i | right before | answer[i] = left part × right | right after |
|---|---|---|---|
| 3 | 1 | 24 × 1 = 24 | 5 |
| 2 | 5 | 6 × 5 = 30 | 20 |
| 1 | 20 | 2 × 20 = 40 | 60 |
| 0 | 60 | 1 × 60 = 60 | 120 |

Answer: `[60, 40, 30, 24]`.

### Edge cases

- **One zero**: every product includes it except the one that skips it, so only that index is non-zero.
- **Two or more zeros**: every product includes a zero, so the answer is all zeros. The two passes handle both cases without special code.
- **Negative numbers** need nothing special; signs multiply through.

### Common mistakes

- Dividing the total product by `nums[i]`: not allowed, and it divides by zero.
- Updating the running product **before** writing it, which multiplies `nums[i]` into its own answer.
- Starting the running products at 0 instead of 1: everything becomes 0.

### Other ways to solve it

- **Two arrays** `prefix` and `suffix`, then `answer[i] = prefix[i] * suffix[i]`: the same idea and easier to read, but O(n) extra space.
