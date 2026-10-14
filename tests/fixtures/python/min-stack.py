# Design problem: snake_case methods (get_min for the getMin op), the constructor is __init__.
class MinStack:
    def __init__(self):
        self.items = []  # (value, minimum of this entry and everything below it)

    def push(self, val: int) -> None:
        self.items.append((val, min(val, self.items[-1][1]) if self.items else val))

    def pop(self) -> None:
        self.items.pop()

    def top(self) -> int:
        return self.items[-1][0]

    def get_min(self) -> int:
        return self.items[-1][1]
