class VendingMachine {
  /** @param {Object<string, {price: number, qty: number}>} stock slot code → price in cents and quantity */
  constructor(stock) {
    
  }

  /** Insert one coin (5, 10, 25 or 100 cents). @return {"OK"|"REJECTED"} */
  insert(cents) {
    
  }

  /** Choose a slot. @return {"DISPENSED"|"INSUFFICIENT"|"SOLD_OUT"|"INVALID_SLOT"|"NO_MONEY"|"OUT_OF_SERVICE"} */
  select(slot) {
    
  }

  /** Give back everything inserted and go to IDLE. @return {number} the refunded cents */
  cancel() {
    
  }

  /** Switch OUT_OF_SERVICE on or off, refunding any credit first. @return {number} the refunded cents */
  service(on) {
    
  }

  /** Add `qty` items to a slot in any state. @return {number} the new quantity, or -1 for an unknown slot or a qty below 1 */
  restock(slot, qty) {
    
  }

  /** @return {"IDLE"|"HAS_MONEY"|"OUT_OF_SERVICE"} */
  state() {
    
  }

  /** @return {number} cents inserted and not yet spent or refunded */
  balance() {
    
  }

  /** @return {number} the change paid out by the most recent DISPENSED (0 before any purchase) */
  change() {
    
  }

  /** @return {number} items left in a slot, or -1 for an unknown slot */
  stock(slot) {
    
  }
}
