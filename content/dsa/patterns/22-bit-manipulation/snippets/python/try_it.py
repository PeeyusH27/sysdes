from bit_masks import clear_bit, get_bit, reverse_bits, set_bit, to_int32  # @hide
from xor_tricks import missing_number, two_singles, xor_all  # @hide
from lowest_bit import is_power_of_two, lowest_set_bit, popcount  # @hide
from subsets_bitmask import subsets  # @hide
# Edit the numbers and press Run. The functions are the templates above.
print(bin(44)[2:], get_bit(44, 2), get_bit(44, 0))   # 101100 1 0
print(set_bit(44, 0), clear_bit(44, 5))              # 45 12

print(xor_all([5, 9, 3, 12, 3, 5, 12]))              # 9
print(missing_number([4, 0, 1, 3]))                  # 2
print(two_singles([1, 2, 1, 3, 2, 5]))               # [3, 5]

print(popcount(44), is_power_of_two(64), lowest_set_bit(44))  # 3 True 4
print(len(subsets(["a", "b", "c"])))                 # 8

# Python ints never overflow: 1 << 31 stays positive. to_int32 gives JavaScript's / Java's signed view.
print(1 << 31, to_int32(1 << 31))                    # 2147483648 -2147483648
print(reverse_bits(1))                               # 2147483648
print(~5, int(7.9), to_int32(2 ** 32))               # -6 7 0
