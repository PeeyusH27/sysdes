# Design problem compared as floats. camelCase method names on purpose (LeetCode's Python template): the harness
# looks for add_num first, then addNum.
import heapq


class MedianFinder:
    def __init__(self):
        self.low = []  # max-heap (negated) of the smaller half
        self.high = []  # min-heap of the larger half

    def addNum(self, num: int) -> None:
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def findMedian(self) -> float:
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2
