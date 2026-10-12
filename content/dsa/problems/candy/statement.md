Some children stand in a row, and `ratings[i]` is the rating of child `i`. You hand out candies under two rules:

- every child gets **at least one** candy;
- a child whose rating is **higher** than an immediate neighbour's gets **more** candies than that neighbour.

Neighbours with equal ratings have no rule between them. Return the **minimum** total number of candies you need.

### Constraints

- `1 <= ratings.length <= 2 * 10^4`
- `0 <= ratings[i] <= 2 * 10^4`
