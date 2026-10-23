function carFleet(target, position, speed) {
  // Order the cars from the one closest to the target to the farthest.
  const order = position.map((_, i) => i).sort((a, b) => position[b] - position[a]);
  let fleets = 0;
  let slowest = 0; // arrival time of the fleet directly ahead
  for (const i of order) {
    const time = (target - position[i]) / speed[i]; // time to arrive if nothing blocked this car
    if (time > slowest) {
      fleets++; // it can't catch the fleet ahead: a new fleet
      slowest = time;
    } // else it catches up and merges, travelling at the front fleet's pace
  }
  return fleets;
}
