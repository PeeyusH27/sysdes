// Template 1: union-find (disjoint set union) over items 0 ... n - 1.
// parent[] stores a forest: following parent links from any item ends at its group's root.
// Two items are in the same group exactly when they have the same root.
class UnionFind {
    final int[] parent;
    final int[] rank;   // upper bound on each root's tree height
    int count;          // number of separate groups

    UnionFind(int n) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i; // every item starts as its own root
        rank = new int[n];
        count = n;
    }

    int find(int x) {
        int root = x;
        while (parent[root] != root) root = parent[root];
        while (parent[x] != root) {                // path compression: point the whole path at the root
            int next = parent[x];
            parent[x] = root;
            x = next;
        }
        return root;
    }

    boolean union(int a, int b) {
        int ra = find(a);
        int rb = find(b);
        if (ra == rb) return false;                // already in one group (an edge here closes a cycle)
        if (rank[ra] < rank[rb]) {
            int tmp = ra;
            ra = rb;
            rb = tmp;
        }
        parent[rb] = ra;                           // union by rank: the shorter tree goes under the taller
        if (rank[ra] == rank[rb]) rank[ra]++;
        count--;
        return true;
    }

    boolean connected(int a, int b) {
        return find(a) == find(b);
    }
}
