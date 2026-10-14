# Array in, array out (compare: unordered). LeetCode style on purpose: a Solution class with a camelCase method and
# List used without importing it (the harness predefines List, Optional, Dict, Set and Tuple).
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}  # value -> index
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
        return []
