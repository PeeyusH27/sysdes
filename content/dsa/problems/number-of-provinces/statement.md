There are `n` cities numbered `0` to `n - 1`. You are given an `n × n` matrix `isConnected`: `isConnected[i][j] === 1` means a direct road joins city `i` and city `j`, and `0` means there is no direct road. Roads work in both directions, so the matrix is symmetric, and every city counts as connected to itself (`isConnected[i][i] === 1`).

Roads chain together. If city `a` has a road to `b`, and `b` has a road to `c`, then `a` and `c` are in the same group even without a direct road between them. A **province** is a group of cities that can all reach one another this way, and that no city outside the group can reach.

Return the number of provinces.

### Constraints

- `1 <= n <= 200`
- `isConnected[i][j]` is `0` or `1`
- `isConnected[i][i] === 1` and `isConnected[i][j] === isConnected[j][i]`
