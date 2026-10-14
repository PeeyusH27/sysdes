# A binary min-heap. Python's heapq could do this job, but writing it out shows what Dijkstra relies on.
# compare(a, b) < 0 means a comes out first. The default orders [priority, ...data] lists by priority.
class MinHeap:
    def __init__(self, compare=lambda a, b: a[0] - b[0]):
        self.items = []
        self.compare = compare

    @property
    def size(self):
        return len(self.items)

    def peek(self):
        return self.items[0] if self.items else None

    def push(self, item):
        a = self.items
        a.append(item)
        i = len(a) - 1
        while i > 0:                          # sift up while the parent is larger
            p = (i - 1) >> 1
            if self.compare(a[p], a[i]) <= 0:
                break
            a[p], a[i] = a[i], a[p]
            i = p

    def pop(self):
        a = self.items
        if not a:
            return None                       # None when the heap was empty
        top = a[0]
        last = a.pop()
        if a:
            a[0] = last                       # move the last item to the root and sift it down
            i = 0
            while True:
                l = 2 * i + 1
                r = l + 1
                m = i
                if l < len(a) and self.compare(a[l], a[m]) < 0:
                    m = l
                if r < len(a) and self.compare(a[r], a[m]) < 0:
                    m = r
                if m == i:
                    break
                a[m], a[i] = a[i], a[m]
                i = m
        return top
