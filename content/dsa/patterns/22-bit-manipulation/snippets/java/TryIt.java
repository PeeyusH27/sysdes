import java.util.Arrays;
import java.util.List;

// Edit the numbers and run main. The methods are the templates above.
public final class TryIt {
    public static void main(String[] args) {
        System.out.println(Integer.toBinaryString(44) + " " + BitMasks.getBit(44, 2) + " " + BitMasks.getBit(44, 0)); // 101100 1 0
        System.out.println(BitMasks.setBit(44, 0) + " " + BitMasks.clearBit(44, 5));                                  // 45 12

        System.out.println(XorTricks.xorAll(new int[] {5, 9, 3, 12, 3, 5, 12}));                  // 9
        System.out.println(XorTricks.missingNumber(new int[] {4, 0, 1, 3}));                      // 2
        System.out.println(Arrays.toString(XorTricks.twoSingles(new int[] {1, 2, 1, 3, 2, 5})));  // [3, 5]

        System.out.println(LowestBit.popcount(44) + " " + LowestBit.isPowerOfTwo(64) + " " + LowestBit.lowestSetBit(44)); // 3 true 4
        System.out.println(SubsetsBitmask.subsets(List.of("a", "b", "c")).size());                // 8

        // The 32-bit rule: an int is signed, and >>> reads the same bits as unsigned.
        System.out.println((1 << 31) + " " + Integer.toUnsignedLong(1 << 31));                    // -2147483648 2147483648
        System.out.println(Integer.toUnsignedLong(BitMasks.reverseBits(1)));                      // 2147483648
        System.out.println(~5 + " " + (int) 7.9 + " " + (int) (1L << 32));                        // -6 7 0
    }
}
