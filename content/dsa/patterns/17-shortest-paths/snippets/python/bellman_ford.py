import math


# Template 3: Bellman-Ford. Each round relaxes every edge once, reading the previous round's
# distances, so after r rounds dist[v] is the shortest path that uses at most r edges.
# Negative weights are fine. Pass max_edges = k + 1 for "at most k stops".
def bellman_ford(n, edges, source, max_edges=None):
    if max_edges is None:
        max_edges = n - 1
    dist = [math.inf] * n
    dist[source] = 0
    for _ in range(max_edges):
        nxt = dist[:]                     # read from dist, write into nxt
        changed = False
        for u, v, w in edges:
            if dist[u] + w < nxt[v]:      # inf + w stays inf, so unreached nodes relax nothing
                nxt[v] = dist[u] + w
                changed = True
        dist = nxt
        if not changed:
            break                         # nothing improved, so later rounds can't either
    return dist


# After n - 1 rounds every shortest path is final. If an edge can still be relaxed,
# a negative cycle is reachable and "shortest" is undefined.
def has_negative_cycle(n, edges, source):
    dist = bellman_ford(n, edges, source)
    return any(dist[u] + w < dist[v] for u, v, w in edges)
