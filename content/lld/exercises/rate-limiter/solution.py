import math


class FixedWindow:
    def __init__(self, config):
        self.limit = config["limit"]
        self.window_sec = config["windowSec"]
        self.state = {}  # key -> [index of the window, count]

    def allow(self, key, now):
        window = math.floor(now / self.window_sec)
        s = self.state.get(key)
        if s is None or s[0] != window:
            s = [window, 0]  # a new window starts at zero
            self.state[key] = s
        if s[1] >= self.limit:
            return False
        s[1] += 1
        return True


class SlidingWindowLog:
    def __init__(self, config):
        self.limit = config["limit"]
        self.window_sec = config["windowSec"]
        self.logs = {}  # key -> timestamps of allowed requests, oldest first

    def allow(self, key, now):
        log = self.logs.setdefault(key, [])
        # The window is (now - window_sec, now], so a timestamp exactly window_sec old is already out.
        while log and log[0] <= now - self.window_sec:
            log.pop(0)
        if len(log) >= self.limit:
            return False  # a rejected request is not logged
        log.append(now)
        return True


class TokenBucket:
    def __init__(self, config):
        self.capacity = config["capacity"]
        self.refill_per_sec = config["refillPerSec"]
        self.buckets = {}  # key -> [tokens, last]

    def allow(self, key, now):
        b = self.buckets.get(key)
        if b is None:
            b = [self.capacity, now]  # a key starts with a full bucket
            self.buckets[key] = b
        b[0] = min(self.capacity, b[0] + (now - b[1]) * self.refill_per_sec)
        b[1] = now
        if b[0] < 1:
            return False
        b[0] -= 1
        return True


# Adding a fourth algorithm means one new class and one new line here. Nothing else changes.
STRATEGIES = {
    "fixed-window": FixedWindow,
    "sliding-window-log": SlidingWindowLog,
    "token-bucket": TokenBucket,
}


class RateLimiter:
    def __init__(self, strategy, config):
        self.use_strategy(strategy, config)

    def use_strategy(self, strategy, config):
        algorithm = STRATEGIES.get(strategy)
        if algorithm is None:
            return False  # unknown name: keep the current strategy
        self.algorithm = algorithm(config)  # a new object means every key starts fresh
        return True

    def allow(self, key, now_sec):
        return self.algorithm.allow(key, now_sec)
