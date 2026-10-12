A car with `capacity` empty seats drives **east only**: it never turns around.

You are given `trips`, where `trips[i] = [numPassengers, from, to]` means a group of `numPassengers` people gets in at kilometre `from` and gets out at kilometre `to`. At any stop, people getting out leave **before** new people get in, so a group that gets out at kilometre 5 never shares the car with a group that gets in at kilometre 5.

Return `true` if the car can serve every trip without ever carrying more than `capacity` passengers, and `false` otherwise. The trips can be given in any order.

### Constraints

- `1 <= trips.length <= 1000`
- `trips[i].length == 3`
- `1 <= numPassengers <= 100`
- `0 <= from < to <= 1000`
- `1 <= capacity <= 10^5`
