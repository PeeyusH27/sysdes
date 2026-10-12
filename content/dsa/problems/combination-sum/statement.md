You are given an array of **distinct** positive integers `candidates` and a positive integer `target`. Return every combination of candidates whose sum equals `target`.

Each candidate may be used **any number of times** in a combination. Two combinations are the same if they use the same candidates the same number of times, whatever the order, so `[2, 2, 3]` and `[3, 2, 2]` count once. Return each distinct combination once, in any order, with its numbers in any order. If no combination works, return an empty array.

### Constraints

- `1 <= candidates.length <= 30`
- `1 <= candidates[i] <= 40`, all distinct
- `1 <= target <= 40`
- There are fewer than 150 valid combinations.
