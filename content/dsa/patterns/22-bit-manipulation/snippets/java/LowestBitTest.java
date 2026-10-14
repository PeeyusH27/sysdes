final class LowestBitTest {
    public static void main(String[] args) {
        Check.test("counts set bits one at a time", () -> {
            Check.eq(0, LowestBit.popcount(0));
            Check.eq(3, LowestBit.popcount(44));            // 101100
            Check.eq(31, LowestBit.popcount(2147483647));
            Check.eq(32, LowestBit.popcount(-1));           // all 32 bits of a negative int
        });

        Check.test("recognises powers of two", () -> {
            for (int x : new int[] {1, 2, 32, 1024}) Check.isTrue(LowestBit.isPowerOfTwo(x));
            for (int x : new int[] {0, 3, 6, 40, -8}) Check.isTrue(!LowestBit.isPowerOfTwo(x));
        });

        Check.test("isolates the lowest set bit", () -> {
            Check.eq(4, LowestBit.lowestSetBit(44));
            Check.eq(8, LowestBit.lowestSetBit(40));
            Check.eq(0, LowestBit.lowestSetBit(0));
        });

        Check.test("counts bits for every number up to n", () -> {
            Check.eq(new int[] {0, 1, 1, 2, 1, 2, 2, 3}, LowestBit.countBitsUpTo(7));
            Check.eq(new int[] {0}, LowestBit.countBitsUpTo(0));
            int[] big = LowestBit.countBitsUpTo(1000);
            for (int i = 0; i < big.length; i++) Check.eq(LowestBit.popcount(i), big[i]);
        });

        Check.finish();
    }
}
