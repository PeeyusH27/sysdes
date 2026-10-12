function canCompleteCircuit(gas, cost) {
  let total = 0;  // gas minus cost over the whole loop
  let tank = 0;   // fuel left since the current candidate start
  let start = 0;
  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {   // can't get from `start` past station i
      start = i + 1;  // and no station in between can either: try the next one
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}
