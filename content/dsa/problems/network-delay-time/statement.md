A network has `n` nodes labelled `1` to `n`. You are given a list `times` of **directed** edges: `times[i] = [u, v, w]` means a signal sent from node `u` arrives at node `v` after `w` units of time. There may be more than one edge from `u` to `v`.

A signal is sent from node `k` at time 0. Every node passes the signal on along all of its outgoing edges as soon as it first receives it.

Return the time at which the **last** node receives the signal. If some node can never receive it, return `-1`.

### Constraints

- `1 <= n <= 100`
- `0 <= times.length <= 6000`
- `1 <= u, v <= n` and `u !== v`
- `0 <= w <= 100`
- `1 <= k <= n`
