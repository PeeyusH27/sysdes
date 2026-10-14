# Template 4: subsets as bitmasks. Bit i of mask says whether items[i] is in the subset, so
# counting mask from 0 to 2^n - 1 lists every subset exactly once. (Java and JavaScript need n <= 30
# because their ints are 32-bit; Python has no such limit, but 2^n subsets grow fast anyway.)
def subsets(items):
    n = len(items)
    out = []
    for mask in range(1 << n):
        out.append([items[i] for i in range(n) if mask & (1 << i)])
    return out


# Every submask of mask, from mask itself down to 0. (s - 1) & mask jumps to the next smaller
# number that only uses bits of mask.
def submasks(mask):
    out = []
    s = mask
    while True:
        out.append(s)
        if s == 0:
            break
        s = (s - 1) & mask
    return out
