public final class BitMasks {
    // Template 1: masks. 1 << i is an int with only bit i set; combine it with &, | and ^
    // to test, set, clear or toggle that one bit and leave every other bit alone.
    // An int has 32 bits, so i must be between 0 and 31 (Java silently uses i % 32 otherwise).
    public static int getBit(int n, int i) {
        return (n >> i) & 1;        // 0 or 1
    }

    public static int setBit(int n, int i) {
        return n | (1 << i);
    }

    public static int clearBit(int n, int i) {
        return n & ~(1 << i);       // ~ flips the mask: every bit is 1 except bit i
    }

    public static int toggleBit(int n, int i) {
        return n ^ (1 << i);
    }

    // Walk all 32 bits from the lowest up, building the reversed number. >>> shifts in zeros instead of
    // copies of the sign bit, so a negative n still ends after 32 steps. Java has no unsigned int:
    // the result is the right 32 bits, and Integer.toUnsignedLong(result) reads them as unsigned.
    public static int reverseBits(int n) {
        int result = 0;
        for (int i = 0; i < 32; i++) {
            result = (result << 1) | (n & 1);
            n >>>= 1;
        }
        return result;
    }
}
