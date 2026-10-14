from opposite_ends import pair_sum  # @hide
from read_write import remove_duplicates  # @hide
# Edit the inputs and press Run. pair_sum and remove_duplicates are the templates above.
print(pair_sum([1, 3, 4, 6, 8, 11], 10))   # [2, 3]
print(pair_sum([2, 4, 5, 9], 12))          # [-1, -1]

nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
k = remove_duplicates(nums)
print(k, nums[:k])                         # 5 [0, 1, 2, 3, 4]
