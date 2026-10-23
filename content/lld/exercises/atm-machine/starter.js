class Atm {
  /** @param {Array<[string, string, number]>} accounts [id, pin, balance]  @param {number[]} stock [n100, n50, n20, n10] */
  constructor(accounts, stock) {
    
  }

  /** @return {string} "OK" | "UNKNOWN_CARD" | "LOCKED" | "INVALID_STATE" */
  insertCard(id) {
    
  }

  /** @return {string} "OK" | "WRONG_PIN" | "LOCKED" | "INVALID_STATE" */
  enterPin(pin) {
    
  }

  /** @return {number} the balance, or -1 unless authenticated */
  balance() {
    
  }

  /** @return {Array<[number, number]>|string} [note, count] pairs largest first, or "INVALID_STATE" | "INVALID_AMOUNT" | "NO_EXACT_NOTES" | "INSUFFICIENT_FUNDS" | "JAM" */
  withdraw(amount) {
    
  }

  /** @return {string} "OK" or "INVALID_STATE" */
  eject() {
    
  }

  /** @return {string} "IDLE" | "CARD_IN" | "AUTHENTICATED" */
  state() {
    
  }

  /** @return {Array<[number, number]>} [[100, c], [50, c], [20, c], [10, c]] */
  cash() {
    
  }

  /** Make the cash unit fail (true) or work (false). @return {boolean} true */
  jam(flag) {
    
  }
}
