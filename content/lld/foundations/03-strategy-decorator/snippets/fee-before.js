// Every new rule is one more `if`, and the order of the ifs is the order of the rules, hidden.
export function parkingFee({ minutes, enterHour, vehicle }) {
  const hours = Math.ceil(minutes / 60);
  let fee;
  if (vehicle === 'bike') fee = hours * 10;
  else if (vehicle === 'truck') fee = hours * 40;
  else fee = hours * 20;

  if (minutes <= 10) fee = 0;                                       // grace period
  if (enterHour >= 22 || enterHour < 6) fee = Math.round(fee / 2);  // night discount
  if (fee > 100) fee = 100;                                         // cap
  return fee;
}
