class PricingEngine {
  /** `ratePerHour` is in cents; the base fee charges every started hour. */
  constructor(ratePerHour) {
    
  }

  /** Add a rule on top of the existing ones. @return {boolean} false for an unknown rule name (or one already added) */
  addRule(name, params) {
    
  }

  /** Remove a rule by name. @return {boolean} true if it was there */
  removeRule(name) {
    
  }

  /** The price in cents for a stay of `minutes`, after every rule has been applied in the order added. @return {number} */
  fee(minutes) {
    
  }
}
