class ParkingLot {
  /** `floors` is an array of floors, each an array of spot types: "bike", "compact" or "large". */
  constructor(floors) {
    
  }

  /** Choose how a free spot is picked: "smallest-first" (the default) or "lowest-floor-first". @return {boolean} false for an unknown name */
  useSpotPolicy(name) {
    
  }

  /** Choose how fees are computed: "hourly" (the default) or "flat". @return {boolean} false for an unknown name */
  usePricing(name) {
    
  }

  /** Park a "bike", "car" or "truck" with this plate. @return {number} a ticket id (1, 2, 3, ...) or -1 when nothing fits */
  park(plate, vehicle) {
    
  }

  /** The vehicle leaves after `minutes`. Frees its spot. @return {number} the fee in cents, or -1 for an unknown or used ticket */
  leave(ticketId, minutes) {
    
  }

  /** @return {number} how many free spots of exactly this type the floor has */
  available(floor, spotType) {
    
  }

  /** @return {string} where the ticket's vehicle is parked as "floor-index" (for example "0-2"), or "" if it is not parked */
  spotOf(ticketId) {
    
  }
}
