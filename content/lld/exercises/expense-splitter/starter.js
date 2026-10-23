class Splitwise {
  /** @param {string[]} members */
  constructor(members) {
    
  }

  /** Share `amount` cents paid by `payer` among `users`. @return {string} "OK" or "INVALID" */
  addExpense(payer, amount, type, users, data) {
    
  }

  /** `from` pays `to` back part or all of a debt. @return {string} "OK" or "INVALID" */
  settle(from, to, amount) {
    
  }

  /** @return {number} cents `from` currently owes `to` (never negative) */
  owes(from, to) {
    
  }

  /** @return {number} cents owed to `user` minus cents `user` owes; 0 for a non-member */
  balance(user) {
    
  }

  /** @return {Array<[string, string, number]>} payments [from, to, cents] that settle everyone */
  simplify() {
    
  }

  /** @return {number} how many expenses have been accepted */
  expenseCount() {
    
  }
}
