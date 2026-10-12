You are given two lists of closed intervals, `firstList` and `secondList`. Within each list, the intervals are sorted by start and pairwise disjoint (no two share a point).

Return the **intersection** of the two lists: every closed interval of points that lies inside some interval of `firstList` **and** inside some interval of `secondList`, sorted by start.

The intersection of two closed intervals is either empty or another closed interval. For example, `[1, 5]` and `[3, 9]` intersect in `[3, 5]`, and `[1, 5]` and `[5, 10]` intersect in the single point `[5, 5]`.

### Constraints

- `0 <= firstList.length, secondList.length <= 1000`
- `0 <= start <= end <= 10^9`
- Each list is sorted by start and its intervals are disjoint.
