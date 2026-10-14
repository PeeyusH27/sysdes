# Template 1: masks. 1 << i is a number with only bit i set; combine it with &, | and ^
# to test, set, clear or toggle that one bit and leave every other bit alone.
# Python ints are unbounded (no 32-bit wraparound), so any i works and setting bit 31 stays positive.
# Negative numbers behave as if they had infinitely many leading 1 bits.
def get_bit(n, i):
    return (n >> i) & 1        # 0 or 1


def set_bit(n, i):
    return n | (1 << i)


def clear_bit(n, i):
    return n & ~(1 << i)       # ~ flips the mask: every bit is 1 except bit i


def toggle_bit(n, i):
    return n ^ (1 << i)


# Walk all 32 bits from the lowest up, building the reversed number. Masking with 0xFFFFFFFF first
# keeps only the low 32 bits, so a negative n is read as its unsigned 32-bit value (and the loop stays 32 steps).
def reverse_bits(n):
    n &= 0xFFFFFFFF
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)
        n >>= 1
    return result              # already an unsigned 32-bit number


# What JavaScript's | 0 does: wrap to a signed 32-bit integer.
def to_int32(n):
    n &= 0xFFFFFFFF
    return n - (1 << 32) if n & 0x80000000 else n
