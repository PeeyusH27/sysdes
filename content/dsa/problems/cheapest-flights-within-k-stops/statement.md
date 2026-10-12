There are `n` cities numbered `0` to `n - 1` and a list of one-way `flights`, where `flights[i] = [from, to, price]` is a flight from city `from` to city `to` costing `price`.

Given a start city `src`, a destination `dst` and an integer `k`, return the **cheapest total price** to fly from `src` to `dst` using **at most `k` stops**. A stop is a city where you change planes, so at most `k` stops means at most `k + 1` flights. If no such route exists, return `-1`.

### Constraints

- `1 <= n <= 100`
- `0 <= flights.length <= n · (n - 1)`
- `from !== to`, and no two flights have the same `from` and `to`
- `1 <= price <= 10^4`
- `0 <= src, dst, k < n` and `src !== dst`
