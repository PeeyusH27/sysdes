// Every new customer kind reopens this function.
export function price(kind, cents) {
  if (kind === 'regular') return cents;
  if (kind === 'gold') return cents - Math.floor(cents / 10);
  if (kind === 'employee') return cents - Math.floor((cents * 3) / 10);
  return cents; // 'student' is silently charged in full until someone edits this
}
