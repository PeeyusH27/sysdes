final class BitMasksTest {
    public static void main(String[] args) {
        Check.test("reads single bits", () -> {
            Check.eq(new int[] {1, 0, 1, 0}, new int[] {
                BitMasks.getBit(0b1010, 3), BitMasks.getBit(0b1010, 2), BitMasks.getBit(0b1010, 1), BitMasks.getBit(0b1010, 0)});
            Check.eq(1, BitMasks.getBit(-1, 31)); // -1 is all ones in 32-bit two's complement
        });

        Check.test("sets, clears and toggles one bit without touching the others", () -> {
            Check.eq(0b1010, BitMasks.setBit(0b1000, 1));
            Check.eq(0b1010, BitMasks.setBit(0b1010, 1));
            Check.eq(0b1011, BitMasks.clearBit(0b1111, 2));
            Check.eq(0b1011, BitMasks.clearBit(0b1011, 2));
            Check.eq(0b0100, BitMasks.toggleBit(0b0101, 0));
            Check.eq(0b0111, BitMasks.toggleBit(0b0101, 1));
        });

        Check.test("bit 31 makes a signed 32-bit result negative", () -> {
            Check.eq(-2147483648, BitMasks.setBit(0, 31));
            Check.eq(2147483648L, Integer.toUnsignedLong(BitMasks.setBit(0, 31)));
        });

        Check.test("reverses all 32 bits as an unsigned number", () -> {
            Check.eq(2147483648L, Integer.toUnsignedLong(BitMasks.reverseBits(1)));
            Check.eq(1610612736L, Integer.toUnsignedLong(BitMasks.reverseBits(6)));
            Check.eq(0L, Integer.toUnsignedLong(BitMasks.reverseBits(0)));
            Check.eq(4294967295L, Integer.toUnsignedLong(BitMasks.reverseBits((int) 4294967295L)));
            Check.eq(1L, Integer.toUnsignedLong(BitMasks.reverseBits((int) 2147483648L)));
        });

        Check.finish();
    }
}
