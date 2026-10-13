export const Dir = Object.freeze({ UP: 'up', DOWN: 'down' });

export const CarState = Object.freeze({
  IDLE: 'IDLE',                     // stopped at a floor, doors closed
  MOVING_UP: 'MOVING_UP',
  MOVING_DOWN: 'MOVING_DOWN',
  DOORS_OPEN: 'DOORS_OPEN',         // only ever entered while stopped at a floor
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
});

// A hall call is a floor plus the arrow someone pressed; a car call is a floor pressed inside one car.
export const hallCall = (floor, dir) => ({ kind: 'hall', floor, dir, key: `${floor}${dir === Dir.UP ? '▲' : '▼'}` });
export const carCall = (carId, floor) => ({ kind: 'car', carId, floor });

export const sign = dir => (dir === Dir.UP ? 1 : -1);
export const opposite = dir => (dir === Dir.UP ? Dir.DOWN : Dir.UP);
