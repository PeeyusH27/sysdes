// Edges are {from, to}: "from must come before to". Edit them and run main.
public class TryIt {
    public static void main(String[] args) {
        int[][] edges = {{0, 2}, {1, 2}, {2, 3}, {1, 4}, {4, 3}};
        System.out.println(Kahn.topoSortKahn(5, edges));      // [0, 1, 2, 4, 3]
        System.out.println(DfsTopo.topoSortDfs(5, edges));    // [1, 4, 0, 2, 3]: a different order, just as valid
        System.out.println(KahnLevels.topoLevels(5, edges));  // [[0, 1], [2, 4], [3]]: three rounds

        int[][] loop = {{0, 1}, {1, 2}, {2, 0}};
        System.out.println(Kahn.topoSortKahn(3, loop) + " " + DfsTopo.topoSortDfs(3, loop) + " " + KahnLevels.topoLevels(3, loop)); // [] [] null
    }
}
