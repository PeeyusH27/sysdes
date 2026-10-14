import math

from min_heap import MinHeap


# Template 2: Dijkstra for non-negative weights. Always expand the closest node not yet settled.
# Lazy deletion: instead of updating an entry inside the heap, push a new one and skip
# entries that are stale (a shorter distance was found after they were pushed).
def dijkstra(n, edges, source):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))             # directed; also append (u, w) to adj[v] if undirected
    dist = [math.inf] * n
    dist[source] = 0
    heap = MinHeap()
    heap.push([0, source])
    while heap.size > 0:
        d, u = heap.pop()
        if d > dist[u]:
            continue                      # stale entry: u was settled with a smaller distance
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heap.push([dist[v], v])
    return dist                           # math.inf = unreachable


# The same loop with two extras: remember how each node was reached (prev) to rebuild the path,
# and stop as soon as the target is popped, because a popped node's distance is final.
def shortest_path(n, edges, source, target):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
    dist = [math.inf] * n
    prev = [-1] * n
    dist[source] = 0
    heap = MinHeap()
    heap.push([0, source])
    while heap.size > 0:
        d, u = heap.pop()
        if d > dist[u]:
            continue
        if u == target:
            break
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                prev[v] = u
                heap.push([dist[v], v])
    if dist[target] == math.inf:
        return {"dist": -1, "path": []}
    path = []
    v = target
    while v != -1:
        path.append(v)
        v = prev[v]
    return {"dist": dist[target], "path": path[::-1]}
