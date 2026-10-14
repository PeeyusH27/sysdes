import java.util.*;

// Edit the inputs and run main. The classes and functions are the templates above.
public class TryIt {
    public static void main(String[] args) {
        UnionFind uf = new UnionFind(6);
        uf.union(0, 1);
        uf.union(2, 3);
        uf.union(1, 3);                                                   // two rank-1 trees: 2 goes under 0
        System.out.println(uf.connected(0, 2) + " " + uf.connected(0, 4)); // true false
        System.out.println(uf.count);                                     // 3
        System.out.println(Arrays.toString(uf.parent));                   // [0, 0, 0, 2, 4, 5]
        uf.find(3);                                                       // walks 3 -> 2 -> 0 and re-points 3 at the root
        System.out.println(Arrays.toString(uf.parent));                   // [0, 0, 0, 0, 4, 5]

        System.out.println(CountGroups.countGroups(5, new int[][] {{0, 1}, {1, 2}, {3, 4}}));                   // 2
        System.out.println(Arrays.toString(CycleEdge.firstCycleEdge(4, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 1}}))); // [3, 1]

        KeyedUnionFind<String> emails = new KeyedUnionFind<>();
        emails.union("ana@x.com", "ana@work.com");
        emails.union("ana@work.com", "a.dev@z.com");
        System.out.println(emails.sizeOf("a.dev@z.com"));                 // 3
    }
}
