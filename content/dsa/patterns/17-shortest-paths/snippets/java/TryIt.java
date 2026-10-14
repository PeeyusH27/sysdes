import java.util.Arrays;

// Edit the graphs and run main. The methods are the templates above.
public final class TryIt {
    public static void main(String[] args) {
        System.out.println(Arrays.toString(BfsDistances.bfsDistances(5, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}}, 0))); // [0, 1, 1, 2, 3]

        int[][] roads = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}, {3, 4, 3}};
        System.out.println(Arrays.toString(Dijkstra.dijkstra(5, roads, 0)));  // [0, 3, 1, 4, 7]
        System.out.println(Dijkstra.shortestPath(5, roads, 0, 4));            // PathResult[dist=7, path=[0, 2, 1, 3, 4]]

        // A negative edge: node 1 is popped at distance 2 before 0 -> 2 -> 1 (cost 1) is found.
        int[][] tricky = {{0, 1, 2}, {0, 2, 5}, {2, 1, -4}};
        System.out.println(Dijkstra.shortestPath(3, tricky, 0, 1).dist());    // 2 (wrong)
        System.out.println(Arrays.toString(BellmanFord.bellmanFord(3, tricky, 0))); // [0, 1, 5]

        // At most 2 edges: the 3-edge route to node 3 is not allowed.
        int[][] flights = {{0, 1, 1}, {1, 2, 1}, {2, 3, 1}, {0, 2, 5}, {0, 3, 9}};
        System.out.println(Arrays.toString(BellmanFord.bellmanFord(4, flights, 0, 2))); // [0, 1, 2, 6]

        MinHeap<Object[]> heap = new MinHeap<>((a, b) -> Integer.compare((Integer) a[0], (Integer) b[0]));
        heap.push(new Object[] {5, "e"});
        heap.push(new Object[] {1, "a"});
        heap.push(new Object[] {3, "c"});
        System.out.println(Arrays.toString(heap.pop()) + " " + Arrays.toString(heap.pop())); // [1, a] [3, c]
    }
}
