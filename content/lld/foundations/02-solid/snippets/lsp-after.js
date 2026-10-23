// Neither shape pretends to be the other. They share one small promise: area().
export class Rectangle {
  constructor(w, h) { this.w = w; this.h = h; }
  withWidth(w) { return new Rectangle(w, this.h); } // changes return a new value
  area() { return this.w * this.h; }
}

export class Square {
  constructor(side) { this.side = side; }
  area() { return this.side * this.side; }
}

export const totalArea = (shapes) => shapes.reduce((sum, s) => sum + s.area(), 0);
