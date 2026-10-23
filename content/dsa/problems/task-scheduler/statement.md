A CPU must run a list of tasks. Each task is a single capital letter, and one task takes exactly one unit of time. In every time unit the CPU either runs one task or sits idle. Tasks may be run in any order.

There is a cooldown rule: two tasks with the **same letter** must have at least `n` time units between them (other tasks or idle time). For example with `n = 2`, an `A` at time 0 means the next `A` cannot run before time 3.

Return the **least number of time units** needed to finish every task.

### Constraints

- `1 <= tasks.length <= 10^4`
- Each task is an uppercase letter from `"A"` to `"Z"`.
- `0 <= n <= 100`
