from classic import binary_search  # @hide
from lower_bound import lower_bound, upper_bound  # @hide
from answer_space import ship_within_days  # @hide
# Edit the inputs and press Run. The functions are the templates above.
nums = [1, 3, 3, 3, 5, 8, 9]
print(binary_search(nums, 8))                          # 5
print(binary_search(nums, 4))                          # -1
print(lower_bound(nums, 3), upper_bound(nums, 3))      # 1 4  (the 3s fill indices 1 to 3)
print(upper_bound(nums, 3) - lower_bound(nums, 3))     # 3    (how many 3s)
print(lower_bound(nums, 4))                            # 4    (where 4 would be inserted)

print(ship_within_days([4, 2, 3, 1, 2], 3))            # 5
