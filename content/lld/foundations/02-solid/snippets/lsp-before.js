// A Square "is a" Rectangle, so code written for rectangles should keep working.
export class Rectangle {
  constructor(w, h) { this.w = w; this.h = h; }
  setWidth(w) { this.w = w; }
  setHeight(h) { this.h = h; }
  area() { return this.w * this.h; }
}

export class Square extends Rectangle {
  setWidth(w) { this.w = this.h = w; } // stays square by breaking the parent's promise
  setHeight(h) { this.w = this.h = h; }
}

// Relies on the promise: width and height change independently.
export function areaAt4By5(shape) {
  shape.setWidth(4);
  shape.setHeight(5);
  return shape.area();
}
