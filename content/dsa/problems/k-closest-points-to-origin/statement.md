You are given an array `points`, where `points[i] = [x, y]` is a point on the plane, and an integer `k`. Return the `k` points that are **closest to the origin** `(0, 0)`.

Distance is the ordinary straight-line (Euclidean) distance, `√(x² + y²)`. The tests guarantee the answer is unique (no tie for the last place), and you may return the points in any order. The same point may appear more than once in the input; each copy counts as a separate point.

### Constraints

- `1 <= k <= points.length <= 10^4`
- `-10^4 <= x, y <= 10^4`
