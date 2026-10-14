final class Overlap {
    // Closed intervals [start, end] share a point when each one starts no later than the other ends.
    static boolean overlaps(int[] a, int[] b) {
        return a[0] <= b[1] && b[0] <= a[1];
    }

    // Half-open meetings [start, end): one ending at t and one starting at t don't clash, so the test is strict.
    static boolean clashes(int[] a, int[] b) {
        return a[0] < b[1] && b[0] < a[1];
    }

    // The common part of two closed intervals: from the later start to the earlier end, or null if that's empty.
    static int[] intersect(int[] a, int[] b) {
        int lo = Math.max(a[0], b[0]);
        int hi = Math.min(a[1], b[1]);
        return lo <= hi ? new int[] {lo, hi} : null;
    }
}
