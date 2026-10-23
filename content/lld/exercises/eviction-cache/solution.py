class LruPolicy:
    """Strategy: each policy answers 'who goes next?' and nothing else. The cache owns the values."""

    def __init__(self):
        self.order = {}  # a dict keeps insertion order: first key = least recent

    def insert(self, key):
        self.order[key] = True

    def use(self, key):
        del self.order[key]  # re-insert = newest
        self.order[key] = True

    def forget(self, key):
        self.order.pop(key, None)

    def ranked(self):
        return list(self.order)


class FifoPolicy:
    def __init__(self):
        self.order = {}

    def insert(self, key):
        self.order[key] = True

    def use(self, key):
        pass  # reads and replacements do not change the order

    def forget(self, key):
        self.order.pop(key, None)

    def ranked(self):
        return list(self.order)


class LfuPolicy:
    def __init__(self):
        self.info = {}  # key -> [count, last]
        self.tick = 0

    def insert(self, key):
        self.tick += 1
        self.info[key] = [1, self.tick]

    def use(self, key):
        self.tick += 1
        entry = self.info[key]
        entry[0] += 1
        entry[1] = self.tick

    def forget(self, key):
        self.info.pop(key, None)  # the count is forgotten with the key

    def ranked(self):
        return sorted(self.info, key=lambda k: (self.info[k][0], self.info[k][1]))


# Adding a policy is one line here; EvictionCache never changes.
POLICIES = {"lru": LruPolicy, "fifo": FifoPolicy, "lfu": LfuPolicy}


class EvictionCache:
    def __init__(self, capacity, policy):
        self.capacity = capacity
        self.policy = POLICIES[policy]()
        self.values = {}

    def get(self, key):
        if key not in self.values:
            return -1
        self.policy.use(key)
        return self.values[key]

    def put(self, key, value):
        if key in self.values:
            self.values[key] = value
            self.policy.use(key)
            return ""  # replacing never grows the cache
        evicted = self._evict_one() if len(self.values) >= self.capacity else ""
        self.values[key] = value
        self.policy.insert(key)
        return evicted

    def peek(self, key):
        return self.values.get(key, -1)

    def remove(self, key):
        if key not in self.values:
            return False
        del self.values[key]
        self.policy.forget(key)
        return True

    def keys(self):
        return self.policy.ranked()

    def resize(self, capacity):
        self.capacity = capacity
        evicted = []
        while len(self.values) > capacity:
            evicted.append(self._evict_one())
        return evicted

    def _evict_one(self):
        victim = self.policy.ranked()[0]
        del self.values[victim]
        self.policy.forget(victim)
        return victim
