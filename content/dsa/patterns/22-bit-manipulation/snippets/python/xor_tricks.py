# Template 2: XOR cancellation. x ^ x = 0, x ^ 0 = x, and the order doesn't matter, so
# XOR-ing a list leaves exactly the bits of the values that appear an odd number of times.
def xor_all(nums):
    acc = 0
    for x in nums:
        acc ^= x
    return acc


# Missing number in 0..n: XOR every index and value; present numbers appear twice and cancel.
def missing_number(nums):
    acc = len(nums)
    for i, x in enumerate(nums):
        acc ^= i ^ x
    return acc


# Two values appear once, all others twice. a ^ b is non-zero, so pick a bit where a and b differ
# and XOR each half separately: each half then holds exactly one of the two singles.
def two_singles(nums):
    both = xor_all(nums)
    bit = both & -both                # lowest set bit of a ^ b
    a = 0
    for x in nums:
        if x & bit:
            a ^= x
    return sorted([a, both ^ a])
