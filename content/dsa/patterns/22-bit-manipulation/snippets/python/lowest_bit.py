# Template 3: n & (n - 1) removes the lowest set bit. n - 1 flips that bit to 0 and every 0 below
# it to 1, so the AND keeps the higher bits and wipes out the rest.
def popcount(n):
    n &= 0xFFFFFFFF            # a negative Python int has endless 1 bits and would never reach 0: count its 32-bit form
    count = 0
    while n != 0:
        n &= n - 1             # one iteration per set bit
        count += 1
    return count


# A power of two has exactly one set bit, so removing it leaves 0.
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0


# n & -n keeps only the lowest set bit (-n is ~n + 1 in two's complement).
def lowest_set_bit(n):
    return n & -n


# Counts for every number 0..n: i >> 1 is i without its last bit, already computed.
def count_bits_up_to(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
