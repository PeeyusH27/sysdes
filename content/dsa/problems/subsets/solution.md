### Intuition

Every number is either in a subset or not, so `n` numbers give `2^n` subsets. Backtracking builds them one choice at a time with a single shared `path` array:

- **Choose**: push a number onto `path`.
- **Explore**: recurse to extend it further.
- **Un-choose**: pop the number, so `path` is back to what it was and the next option can be tried.

To build each subset **exactly once**, only ever add numbers to the **right** of the last one added. A call `backtrack(start)` may choose `nums[i]` only for `i >= start`, and recurses with `i + 1`. Then `{2, 5}` is only built as "2 then 5", never as "5 then 2".

Every call's `path` is a valid subset (including the empty one at the root), so each call records a copy as soon as it starts.

### Step by step

1. Create `result = []` and `path = []`.
2. Define `backtrack(start)`:
   1. Push a **copy** of `path` into `result`.
   2. For each `i` from `start` to `nums.length - 1`:
      - push `nums[i]` onto `path` (choose),
      - call `backtrack(i + 1)` (explore),
      - pop it off `path` (un-choose).
3. Call `backtrack(0)` and return `result`.

The recursion tree for `[2, 5, 9]` has one node per subset:

```
[]
├── [2]
│   ├── [2, 5]
│   │   └── [2, 5, 9]
│   └── [2, 9]
├── [5]
│   └── [5, 9]
└── [9]
```

### Dry run: `nums = [2, 5, 9]`

| call | path on entry | records | then |
|---|---|---|---|
| `backtrack(0)` | [] | [] | choose 2 |
| `backtrack(1)` | [2] | [2] | choose 5 |
| `backtrack(2)` | [2, 5] | [2, 5] | choose 9 |
| `backtrack(3)` | [2, 5, 9] | [2, 5, 9] | loop is empty: return, pop 9, then pop 5 |
| `backtrack(3)` | [2, 9] | [2, 9] | return, pop 9, pop 2 |
| `backtrack(2)` | [5] | [5] | choose 9 |
| `backtrack(3)` | [5, 9] | [5, 9] | return, pop 9, pop 5 |
| `backtrack(3)` | [9] | [9] | return, pop 9: done |

8 calls, 8 subsets.

### Why it works

Each subset, written with its numbers in index order, corresponds to exactly one path from the root of the tree: choose its first number, then its second, and so on. Because indices only increase along a path, no subset can be reached in two different orders, so nothing is duplicated and nothing is missed.

### Common mistakes

- `result.push(path)` instead of `result.push([...path])`. Every entry is then the **same** array, which is empty by the time you return.
- Recursing with `start + 1` instead of `i + 1`. After choosing `nums[2]` you could then choose `nums[1]`, producing `[9, 5]` as well as `[5, 9]`.
- Recording only when `path.length === nums.length`: that is the rule for permutations, and here it yields just the full array.
- Forgetting the `pop()`: `path` keeps growing across branches.

### Other ways to solve it

- **Iterative doubling**: start with `[[]]`; for each number, append a copy of every existing subset with that number added. Same O(n · 2^n).
- **Bitmasks**: every integer `mask` from `0` to `2^n - 1` describes one subset, where bit `i` says whether `nums[i]` is in it.
