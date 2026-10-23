# Neither shape pretends to be the other. They share one small promise: area().
class Rectangle:
    def __init__(self, w, h):
        self.w, self.h = w, h

    def with_width(self, w):  # changes return a new value
        return Rectangle(w, self.h)

    def area(self):
        return self.w * self.h


class Square:
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side


def total_area(shapes):
    return sum(s.area() for s in shapes)
