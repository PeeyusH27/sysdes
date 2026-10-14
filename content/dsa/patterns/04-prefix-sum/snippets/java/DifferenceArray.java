// Template 4: difference array. To add `delta` to every index in [left, right], write +delta at left and
// -delta at right + 1: O(1) per update. One running sum at the end turns the differences into values.
public final class DifferenceArray {
    private DifferenceArray() {}

    public static int[] applyRangeAdds(int n, int[][] updates) {
        int[] diff = new int[n + 1];   // one spare slot so right + 1 never falls off
        for (int[] u : updates) {
            int left = u[0], right = u[1], delta = u[2];
            diff[left] += delta;
            diff[right + 1] -= delta;
        }
        int[] out = new int[n];
        int running = 0;
        for (int i = 0; i < n; i++) {
            running += diff[i];
            out[i] = running;
        }
        return out;
    }
}
