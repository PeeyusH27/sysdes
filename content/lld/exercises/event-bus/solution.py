class EventBus:
    def __init__(self):
        self.subs = {}   # subscriber id -> set of topic patterns
        self.boxes = {}  # subscriber id -> received [topic, message] pairs, in delivery order

    @staticmethod
    def matches(pattern, topic):
        if pattern.endswith(".*"):
            return topic.startswith(pattern[:-1])
        return pattern == topic

    def subscribe(self, pattern, id):
        if id not in self.subs:
            self.subs[id] = set()
            self.boxes[id] = []
        self.subs[id].add(pattern)

    def unsubscribe(self, pattern, id):
        patterns = self.subs.get(id)
        if patterns is None or pattern not in patterns:
            return False
        patterns.remove(pattern)
        return True

    def publish(self, topic, message):
        delivered = 0
        for id, patterns in self.subs.items():
            # One delivery per subscriber, even when several of its patterns match.
            if any(self.matches(p, topic) for p in patterns):
                self.boxes[id].append([topic, message])
                delivered += 1
        return delivered

    def inbox(self, id):
        return list(self.boxes.get(id, []))
