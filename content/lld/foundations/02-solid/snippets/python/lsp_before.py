# A Square "is a" Rectangle, so code written for rectangles should keep working.
class Rectangle:
    def __init__(self, w, h):
        self.w, self.h = w, h

    def set_width(self, w):
        self.w = w

    def set_height(self, h):
        self.h = h

    def area(self):
        return self.w * self.h


class Square(Rectangle):
    def set_width(self, w):
        self.w = self.h = w  # stays square by breaking the parent's promise

    def set_height(self, h):
        self.w = self.h = h


def area_at_4_by_5(shape):
    """Relies on the promise: width and height change independently."""
    shape.set_width(4)
    shape.set_height(5)
    return shape.area()
