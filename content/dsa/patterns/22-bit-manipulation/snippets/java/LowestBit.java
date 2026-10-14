public final class LowestBit {
    // Template 3: n & (n - 1) removes the lowest set bit. n - 1 flips that bit to 0 and every 0 below
    // it to 1, so the AND keeps the higher bits and wipes out the rest.
    public static int popcount(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;             // one iteration per set bit
            count++;
        }
        return count;
    }

    // A power of two has exactly one set bit, so removing it leaves 0.
    public static boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
    }

    // n & -n keeps only the lowest set bit (-n is ~n + 1 in two's complement).
    public static int lowestSetBit(int n) {
        return n & -n;
    }

    // Counts for every number 0..n: i >> 1 is i without its last bit, already computed.
    public static int[] countBitsUpTo(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
        return bits;
    }
}
