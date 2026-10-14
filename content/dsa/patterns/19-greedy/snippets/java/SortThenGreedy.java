import java.util.Arrays;

public final class SortThenGreedy {
    // Template 1: sort, then match greedily. Each child needs a cookie of at least greed[i]; each cookie feeds one child.
    // Walk the cookies smallest first and give each one to the least greedy child still waiting, if it is big enough.
    public static int findContentChildren(int[] greed, int[] cookies) {
        int[] g = greed.clone();
        int[] c = cookies.clone();
        Arrays.sort(g);
        Arrays.sort(c);
        int child = 0;
        for (int i = 0; i < c.length && child < g.length; i++) {
            if (c[i] >= g[child]) child++;       // feed this child; a too-small cookie is useless to everyone left
        }
        return child;
    }
}
