// The rule lives in the callers, so every caller has to remember it.
export class Member {
  constructor(limit = 3) { this.limit = limit; this.loans = []; }
}

export function borrowAtDesk(member, isbn) {
  if (member.loans.length >= member.limit) return false;
  member.loans.push(isbn);
  return true;
}

export function borrowAtKiosk(member, isbn) {
  member.loans.push(isbn); // someone forgot the limit check, and nothing stops them
  return true;
}
