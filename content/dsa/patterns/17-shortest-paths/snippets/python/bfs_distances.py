# Template 1: BFS for unweighted graphs (every edge costs 1). Nodes leave the queue in order of
# distance, so the first time a node is reached is along a shortest path.
def bfs_distances(n, edges, source):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)                  # undirected: drop this line for a directed graph
    dist = [-1] * n                       # -1 = not reached (yet)
    dist[source] = 0
    queue = [source]
    head = 0                              # a head index: list.pop(0) is O(n)
    while head < len(queue):
        u = queue[head]
        head += 1
        for v in adj[u]:
            if dist[v] != -1:
                continue
            dist[v] = dist[u] + 1         # mark when pushed so nothing is queued twice
            queue.append(v)
    return dist
